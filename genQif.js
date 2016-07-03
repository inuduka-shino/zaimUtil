/*eslint no-console: 0 */

(() => {
    'use strict';
    const
        co = require('co'),
        opts = require('opts'),
        fs = require('./lib/fsUtil'),
        dateString = require('./lib/dateString'),
        genQifData = require('./lib/qifUtil'),
        memoUtil = require('./lib/memo'),
        genAccessableZaim = require('./lib/genAccessableZaim');

    const genUserError = (()=>{
        class UserError extends Error {
            constructor(code, message) {
                super(message);
                this.code = code;
            }
        }

        return function(code, message) {
            /*
            let err = new Error(message);
            err.code = code;
            return err;
            */
            return new UserError(code, message);
        };
    })();

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

    function writeOfxFile (moneyStream, catgoryDict) {
        return co(function* (){
            const
                qifData = genQifData();
            let count = 0;

            function genCtgTitle(cid, gid) {
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
                const
                    tryBlock = generateTryBlock(reject);

                moneyStream.on('data',tryBlock((moneyInfo) => {
                    let
                        amount,
                        ctgTitle;

                    if (moneyInfo.active !== 1) {
                        console.log('------');
                        console.log('pass transaction:' + moneyInfo.id);
                        console.log('no-active:' + moneyInfo.active);
                        return; // continue forEach
                    }
                    if (moneyInfo.mode === 'payment') {
                        //type = 'DEBIT';
                        amount =  -1 * Number(moneyInfo.amount);
                    } else if  (moneyInfo.mode === 'income') {
                        //type = 'CREDIT';
                        amount =  Number(moneyInfo.amount);
                    } else if  (moneyInfo.mode === 'transfer') {
                        //type = 'CREDIT';
                        amount =  Number(moneyInfo.amount);
                    } else {
                        console.log('------');
                        console.log('pass transaction:' + moneyInfo.id);
                        console.log('unkown mode:' + moneyInfo.mode);
                        return; // continue forEach
                    }
                    try {
                        if (moneyInfo.mode === 'payment' || moneyInfo.mode === 'income') {
                            ctgTitle = genCtgTitle(moneyInfo.category_id, moneyInfo.genre_id);
                        } else if (moneyInfo.mode === 'transfer') {
                            ctgTitle = 'ATM';
                        } else {
                            throw new Error();
                        }
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

                    {
                        if (moneyInfo.from_account_id === 1 || moneyInfo.to_account_id === 1 ) {
                            count += 1;
                            qifData.addTrans({
                                date: moneyInfo.date,
                                amount:  amount,
                                payee: moneyInfo.place,
                                memo: moneyInfo.name,
                                category: ctgTitle,
                                checknumber: moneyInfo.id
                            });
                        } else {
                            console.log('pass for another account pass transaction:' + moneyInfo.id);
                        }
                    }
                }));
                moneyStream.on('end', ()=> {
                    resolve();
                });
            });
            console.log('total %d件', count);
            // write ofx file.
            yield fs.writeFile(
                'ofxInfo/zaim.qif',
                qifData.serialize()
            );
            console.log('qif file wrote!');
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
        catgoryDict = yield zaim.getCategoryDict(config.categoryNames);

        // zaim から取引情報取得
        //moneys = yield zaim.getMoney(period.start, period.end);
        moneyStream = zaim.zaimMoneyStream(period.start, period.end);

        const ret = yield Promise.all([
            writeOfxFile(
                moneyStream,
                catgoryDict,
                opts.get('new')
            ),
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
