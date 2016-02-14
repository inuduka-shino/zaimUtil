/*eslint no-console: 0 */

(() => {
    'use strict';
    const
        co = require('co'),
        config = require('./config'),
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

        return co(function *() {
            let memo,
                status;
            memo = yield memoUtil('./memo.json').load();
            if (memo.info.accessToken !== undefined && memo.info.accessToken !== undefined) {
                // try access to zaim
                status = yield (
                    zaim.setAccessToken({
                        accessToken: memo.info.accessToken,
                        accessTokenSecret: memo.info.accessTokenSecret
                    })
                    .getUser()
                    .then(() => {return 'Success';})
                    .catch((err) => {
                        if (err.statusCode === 401) {
                            return 'Failure';
                        } else {
                            throw err;
                        }
                    })
                );
            } else {
                status = 'NoSetting';
            }
            // console.log(`status=${status}`);
            if (status === 'Success') {
                return zaim;
            } else {
                let newInfo;

                newInfo = yield zaim.getAccessToken((url) => {
                    process.stdout.write([
                        '以下のURLで認証し、Verifierコードを入手してください。\n',
                        url,
                        '\nInput Verifier:'
                    ].join(''));
                    return readOneline();
                });

                memo.info.accessToken = newInfo.accessToken;
                memo.info.accessTokenSecret = newInfo.accessTokenSecret;
                yield memo.save();

                return zaim.setAccessToken({
                    accessToken: newInfo.accessToken,
                    accessTokenSecret: newInfo.accessTokenSecret
                });
            }
        });
    }


    console.log('start');
    genAccessableZaim().then((zaim) => {
        console.log('load money info');
        return zaim.getMoney(period.start, period.end);
    })
    .then((moneys) => {
        let fileImage,
            writeBackupPromise;

        console.log('loaded');
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
