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
        memoUtil = require('./lib/memo.js');


    function tryReject(reject, cb) {
        return  function () {
            try {
                cb.apply(null, arguments);
            } catch (err) {
                reject(err);
            }

        };
    }
    function generateTryBlock(reject) {
        return tryReject.bind(null, reject);
    }

    function genPeriod() {
        // コマンド引数から対象期間を決定

        let targetMonth, // "YYYY-MM" string
            targetDay;   // DateObject

        // comand line argment
        const target = process.argv[2];
        if (/^[0-9]{4}-[0-9]{1,2}$/.test(target)) {
            targetMonth = target;
        } else if (target === undefined) {
            targetMonth = null;
        } else {
            throw new Error(`argmennt is bad format!("YYYY-MM" !== "${target}")`);
        }

        if (targetMonth === null) {
            targetDay = new Date();
            targetMonth = dateString.makeDayString(targetDay, 'YYYY-MM');
        } else {
            targetDay = new Date(targetMonth);
        }

        return {
            start: dateString.makeFirstDayString(targetDay),
            end: dateString.makeLastDayString(targetDay),
            targetMonth: targetMonth
        };
    }

    function readOneline() {
        // 一行入力処理
        const reader = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve) => {
            const tryBlock = generateTryBlock(resolve);

            reader.on('line', tryBlock((line) => {
                reader.close();
                resolve(line.trim());
            }));
        });
    }

    function genAccessableZaim() {
        // access可能なzaimオブジェクトをPromiseで返す
        // 1. 以前のアクセストークンをmemo.jsonファイルから読む
        // 2. getUserを実行しZAIMにアクセステスト
        // 3. アクセスに失敗したら、getAccessTokenで新規アクセストークを取得
        //    3-1. 標準出力に出力されたURLにアクセス
        //    3-2. そのページで、アクセス認証操作。
        //    3-3. 認証コード（Verifierコード）が表示される
        //    3-4. 標準入録に認証コード（Verifierコード）を入力
        //    3-5. 新規アクセストークンを取得（＋memo.jsonに保存）

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
                        '以下のURLで認証し、Verifierコードを入手しnewInfoてください。\n',
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


    function writeBackupFile (period, moneyStream) {
        return co(function *() {
            // zaim data backup
            const JSONStream = require('JSONStream');
            let
                filename,
                strm;

            filename = (() => {
                // console.log(period.targetMonth);
                const targetMonth = period.targetMonth.split('-').join('');
                return ['work/money', targetMonth, '.txt'].join('');
            })();

            strm = yield fs.createWriteStreamFromNewFile(filename);

            moneyStream
                .pipe(JSONStream.stringify())
                .pipe(strm);

            yield new Promise((resolve) => {
                strm
                    .on('finish',  () => {
                        resolve();
                    });
            });
            console.log(`backuup file wrote. ` + strm.path);
        });
    }


    function writeOfxFile (moneyStream) {
        return co(function* (){
            const ofxData = genOfxData({
                fiOrg: 'ZAIM-INFORMATON',
                fiFid: 'ZAIM0001',
                bankID: 'ZAIM0001B001',
                bankCID: 'BC001',
                acctID: 'ACCT0001',
                acctType: 'SAVINGS'
            });
            let count = 0;

            yield new Promise((resolve, reject) => {
                const tryBlock = generateTryBlock(reject);
                moneyStream.on('data',tryBlock((moneyInfo) => {
                    count += 1;
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
                }));
                moneyStream.on('end', ()=> {
                    resolve();
                });
            });
            console.log('total %d件', count);
            // write ofx file.
            yield fs.writeFile(
                'ofxInfo/Output.ofx',
                ofxData.serialize()
            );
            console.log('ofx file wrote!');
            return count;
        });
    }

    // main
    co(function *() {
        let
            zaim,
            moneyStream,
            period;

        console.log('start');
        zaim = yield genAccessableZaim();
        period =genPeriod();

        // zaim から取引情報取得
        //moneys = yield zaim.getMoney(period.start, period.end);
        console.log([period.start, period.end].join(' - '));
        moneyStream = zaim.zaimMoneyStream(period.start, period.end);

        const ret = yield Promise.all([
            writeOfxFile(moneyStream),
            writeBackupFile(period, moneyStream)
        ]);
        console.log('compleated. ' + ret[0] + '件');

    }).catch((err) => {
        console.error('*** ERROR ***');
        if (err.stack === undefined) {
            console.error(err);
        } else {
            console.error(err.stack);
        }
    });
})();
