/*eslint no-console: 0 */

(() => {
    'use strict';
    const
        co = require('co'),
        opts = require('opts'),
        fs = require('./lib/fsUtil'),
        dateString = require('./lib/dateString'),
        genOfxData = require('./lib/ofxUtil'),
        memoUtil = require('./lib/memo'),
        genAccessableZaim = require('./lib/genAccessableZaim');

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

    function genPeriod(args) {
        // コマンド引数から対象期間を決定

        let targetMonth, // "YYYY-MM" string
            targetDay;   // DateObject

        // comand line argment
        const target = args[0];
        if (/^[0-9]{4}-[0-9]{1,2}$/.test(target)) {
            targetMonth = target;
        } else if (target === undefined) {
            targetMonth = null;
        } else {
            throw new Error(`argmennt is bad format!("YYYY-MM" !== "${target}")`);
        }

        if (targetMonth === null) {
            targetDay = new Date();
        } else {
            targetDay = new Date(targetMonth);
        }
        targetMonth = dateString.makeDayString(targetDay, 'YYYY-MM');

        return {
            start: dateString.makeFirstDayString(targetDay),
            end: dateString.makeLastDayString(targetDay),
            targetMonth: targetMonth
        };
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

    class UserError extends Error {
        constructor(code, message) {
            super(message);
            this.code = code;
        }
    }

    function genUserError(code, message) {
        /*
        let err = new Error(message);
        err.code = code;
        return err;
        */
        return new UserError(code, message);
    }

    function writeOfxFile (moneyStream, catgoryDict) {
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

            function genName(cid, gid) {
                let ctg,
                    ctgName,
                    genre,
                    gnrName;
                try {
                    ctg = catgoryDict.get(cid),
                    ctgName = ctg.category.name;
                    if (ctg.category.active !== 1) {
                        throw genUserError('no-active', `category[${ctgName}:${cid}] is not active`);
                    }
                    if (gid === 0) {
                        return ctgName;
                    }
                    genre = ctg.genres.get(gid);
                    gnrName = genre.name;
                    if (genre.active !== 1) {
                        throw genUserError('no-active', `genre[${gnrName}:${gid}] is not active`);
                    }
                    return [ctgName, gnrName].join('-');
                } catch (err) {
                    throw err;
                }
            }

            yield new Promise((resolve, reject) => {
                const tryBlock = generateTryBlock(reject);
                moneyStream.on('data',tryBlock((moneyInfo) => {
                    count += 1;
                    let type,
                        amount,
                        name;
                    if (moneyInfo.active !== 1) {
                        console.log('------');
                        console.log('pass transaction:' + moneyInfo.id);
                        console.log('no-active:' + moneyInfo.active);
                        return; // continue forEach
                    }
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
                    try {
                        name = genName(moneyInfo.category_id, moneyInfo.genre_id);
                    } catch (err) {
                        if (err.code === 'no-active') {
                            console.log('------');
                            console.log('pass transaction:' + moneyInfo.id);
                            console.log(err.message);
                            // console.log(err);
                            console.dir(moneyInfo);
                        } else {
                            throw err;
                        }
                    }
                    ofxData.addTrans({
                        id: 'ZAIM00A' + moneyInfo.id,
                        type: type,
                        date: moneyInfo.date,
                        amount: amount,
                        name: name,
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
        let memo,
            zaim,
            moneyStream,
            period,
            catgoryDict;


        const config = require('./config');

        console.log('start');

        opts.parse(
            [{
                'short': 'n',
                'long': 'new',
                'description': 'output only new category transaction',
                'value': false,
                'required': false
            }],
            true // for  Automatically generate help message
        );
        config.newCtg = opts.get('new');

        memo = yield memoUtil('./memo.json').load();
        zaim = yield genAccessableZaim({
            consumerKey: config.consumerKey,
            consumerSecret: config.consumerSecret,
            accessToken: memo.info.accessToken,
            accessTokenSecret: memo.info.accessTokenSecret
        }, (newAccessToken) => {
            memo.info.accessToken = newAccessToken.accessToken;
            memo.info.accessTokenSecret = newAccessToken.accessTokenSecret;
            return memo.save();
        });

        period =genPeriod(opts.args());
        console.log([period.start, period.end].join(' - '));

        // zaim からcategory & genre 情報取得
        catgoryDict = yield zaim.getCategoryDict();

        // zaim から取引情報取得
        //moneys = yield zaim.getMoney(period.start, period.end);
        moneyStream = zaim.zaimMoneyStream(period.start, period.end);

        const ret = yield Promise.all([
            writeOfxFile(moneyStream, catgoryDict),
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
