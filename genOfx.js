/*eslint no-console: 0 */

(() => {
    'use strict';
    const config = require('./config'),
        fs = require('./lib/fsUtil'),
        dateString = require('./lib/dateString'),
        makeZaim = require('./lib/zaimUtil'),
        genOfxData = require('./lib/ofxUtil'),
        memoUtil = require('./lib/memo.js'),
        ofxData = genOfxData({
            fiOrg: 'ZAIM-INFORMATON',
            fiFid: 'ZAIM0001',
            bankID: 'ZAIM0001B001',
            bankCID: 'BC001',
            acctID: 'ACCT0001',
            acctType: 'SAVINGS'
        });

    let
        period,
        targetMonth;

    targetMonth = (() => {
        // comand line argment
        const target = process.argv[2];
        if (/^[0-9]{4}-[0-9]{1,2}$/.test(target)) {
            return target;
        } else if (target === undefined) {
            return null;
        }
        throw new Error(`argmennt is bad format!("YYYY-MM" !== "${target}")`);
    })();

    period = (() => {
        let targetDay;
        if (targetMonth === null) {
            targetDay = new Date();
        } else {
            targetDay = new Date(targetMonth);
        }

        return {
            start: dateString.makeFirstDayString(targetDay),
            end: dateString.makeLastDayString(targetDay)
        };
    })();

    function readOneline() {
        const reader = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve) => {
            reader.on('line', (line) => {
                reader.close();
                resolve(line.trim());
            });
        });
    }

    function genAccessableZaim() {
        const zaim = makeZaim(config);
        let memo0;

        console.log('zailm access test start');
        return new Promise((resolve, reject) => {
            memoUtil('./memo.json').load()
            .then((memo) => {
                console.dir(memo.info);

                if (memo.info.accessToken !== undefined && memo.info.accessToken !== undefined) {
                    // try access to zaim
                    memo0 = memo;
                    return zaim.setAccessToken({
                        accessToken: memo.info.accessToken,
                        accessTokenSecret: memo.info.accessTokenSecret
                    }).getUser();
                } else {
                    console.log('no memo');
                    throw {
                        memoError:  'no memo'
                    };
                }
            })
            .then(() => {
                console.log('success to access with memo Info.');
                resolve(zaim);
            })
            .catch((err) => {
                console.log('error memo Access');
                if (err.statusCode === 401 || err.memoError === 'no memo') {
                    zaim.getAccessToken((url) => {
                        console.log('以下のURLで認証し、Verifierコードを入手してください。');
                        console.log(url);
                        console.log('Input Verifier:');
                        return readOneline();
                    }).then((newInfo) => {
                        console.log('get new token --');
                        console.dir(memo0);
                        memo0.info.accessToken = newInfo.accessToken;
                        memo0.info.accessTokenSecret = newInfo.accessTokenSecret;
                        memo0.save()
                        .then(() =>  {
                            console.log('memo saved.');
                            resolve(zaim.setAccessToken({
                                accessToken: newInfo.accessToken,
                                accessTokenSecret: newInfo.accessTokenSecret
                            }));
                        })
                        .catch((err) => {
                            reject(err);
                        });
                    })
                    .catch((err) => {
                        reject(err);
                    });
                } else {
                    reject(err);
                }
            });

        });
    }


    genAccessableZaim().then((zaim) => {
        console.log('get Money');
        return zaim.getMoney(period.start, period.end);
    })
    .then((moneys) => {
        let fileImage,
            writeBackupPromise;

        console.log('OK');
        console.log(moneys.length);
        //console.dir(moneys);
        console.log('file writeing...');
        fileImage = JSON.stringify(moneys, null, '  ');

        // TODO: timestamp filename
        writeBackupPromise = fs.writeFile('work/moneyTest.txt', fileImage);
        moneys.forEach((moneyInfo) => {
            let type,
                amount;
            if (moneyInfo.mode === 'payment') {
                type = 'DEBIT';
                amount =  -1 * Number(moneyInfo.amount);
            } else if  (moneyInfo.mode === 'income') {
                type = 'CREDIT';
                amount =  Number(moneyInfo.amount);
            } else {
                console.log('------');
                console.log('pass transaction:' + moneyInfo.id);
                console.log('unkown mode:' + moneyInfo.mode);
                return; // continue forEach
            }
            ofxData.addTrans({
                id: 'ZAIM00A' + moneyInfo.id,
                type: type,
                date: moneyInfo.date,
                amount: amount,
                name: [moneyInfo.category_id, moneyInfo.genre_id].join('-'),
                memo: [moneyInfo.id, moneyInfo.place].join(' ')
            });
        });
        return writeBackupPromise;
    })
    .then(() => {
        console.log('backuup file wrote.');
        return fs.writeFile(
            'ofxInfo/Output.ofx',
            ofxData.serialize()
        );
    })
    .then(() => {
        console.log('ofx fiel wrote!');
    })
    .catch((err) => {
        console.error(err);
        if (err.stack !== undefined) {
            console.error(err.stack);
        }
    });
})();
