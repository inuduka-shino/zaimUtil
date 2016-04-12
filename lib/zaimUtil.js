/*eslint no-console: 0 */

module.exports = (() => {
    'use strict';

    // Provider info
    const oauth = require('oauth'),
        querystring = require('querystring'),
        co = require('co'),
        stream = require('stream');

    const provider_base = 'https://api.zaim.net/v2/auth/',
        request_url = provider_base + 'request',
        access_url = provider_base + 'access',
        authorize_url = 'https://auth.zaim.net/users/auth',

        api_base = 'https://api.zaim.net/',
        user_url = api_base + 'v2/home/user/verify',
        money_url = api_base + 'v2/home/money',
        category_url = api_base + 'v2/home/category',
        genre_url = api_base + 'v2/home/genre',
        account_url = api_base + 'v2/home/account';

    function getOAuthRequestToken(oauthClient) {
        return new Promise((resolve, reject) => {
            try {
                oauthClient.getOAuthRequestToken((err, authToken, authTokenSecret) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            token: authToken,
                            secret: authTokenSecret
                        });
                    }

                });
            } catch (err) {
                resolve(err);
            }
        });
    }

    function getOAuthAccessToken(oauthClient, authToken, authTokenSecret, verifier) {
        return new Promise((resolve, reject) => {
            oauthClient.getOAuthAccessToken(
                authToken,
                authTokenSecret,
                verifier,
                (err, accessToken, accessTokenSecret) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            accessToken,
                            accessTokenSecret
                        });
                    }
                }
            );
        });
    }

    function getAccessToken(cntxt, inputVerifier) {
        let accessTokenInfo;
        return getOAuthRequestToken(cntxt.client)
            .then((info) => {
                let authURL;
                accessTokenInfo = info;
                authURL = cntxt.client.signUrl(authorize_url, info.token, info.secret);
                return inputVerifier(authURL);
            })
            .then((verifier) => {
                return getOAuthAccessToken(
                    cntxt.client,
                    accessTokenInfo.token,
                    accessTokenInfo.secret,
                    verifier);
            });
    }

    function setAccessToken(cntxt, tokenInfo) {
        //console.log("setAccessToken");
        //console.log(tokenInfo);
        cntxt.token = tokenInfo.accessToken;
        cntxt.secret = tokenInfo.accessTokenSecret;

        return cntxt.selfIF;
    }


    function httpGet(cntxt, url) {
        return new Promise((resolve, reject) => {
            if (!cntxt.token || !cntxt.secret) {
                reject(new Error('accessToken and tokenSecret must be configured.'));
            }
            cntxt.client.get(url, cntxt.token, cntxt.secret, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(typeof data === 'string' ? JSON.parse(data) : data);
                }
            });
        });
    }

    function genRequest(cntxt, url) {
        if (!cntxt.token || !cntxt.secret) {
            throw new Error('accessToken and tokenSecret must be configured.');
        }
        return cntxt.client.get(url, cntxt.token, cntxt.secret);
    }


    function getUser(cntxt) {
        //console.log('request get User.');
        return httpGet(cntxt, user_url);
    }

    function _genSimpleStream() {
        return new stream.Transform({
            objectMode: true,
            transform: function (chunk, encode, cb) {
                try {
                    this.push(chunk);
                    cb();
                } catch (err) {
                    cb(err);
                }
            },
            flush: function (cb) {
                cb();
            }
        });
    }

    function getCategory(cntxt, mode) {
        let url;
        /* 2016.3.23
            zaim apiに以下のＢＵＧ（？）
             - modeがフィルターとして働いていない。
             - modeに（null,undefined,payment）のいずれを指定しても同じ結果
             - mode = 'income'を指定した場合、取得できないcategoryがある。
             - mode = 'income'を明示的に指定しないと取得できないcategoryがある。
        */

        if (mode !== 'payment' && mode !== 'income' && mode !== undefined && mode !== null) {
            return Promise.reject(new Error('bad mode value!'));
        }
        url = category_url + '?' + querystring.stringify({
            mapping: 1,
            mode: mode
        });
        return httpGet(cntxt, url);
    }

    function _getCategoryStream(cntxt, mode, pass) {
        /* pass is id Set for pass */
        let
            ctgsLen,
            idx = 0;

        const prms = getCategory(cntxt, mode).then((ret) => {
            return ret.categories;
        });
        prms.then((ctgs) => {
            ctgsLen = ctgs.length;
        });

        return new stream.Readable({
            objectMode: true,
            read: function () {
                try {
                    let pushObj;
                    prms.then((ctgs) => {
                        do {
                            if (idx >= ctgsLen) {
                                pushObj = null;
                                break;
                            }
                            pushObj = ctgs[idx];
                            idx += 1;
                        } while (pass !== undefined && pass.has(pushObj.id));

                        this.push(pushObj);
                    }).catch((err) => {
                        this.emit('error', err);
                    });
                } catch (err) {
                    this.emit('error', err);
                }
            }
        });
    }
    function getCategoryByStream(cntxt) {
        /* modeを'income','payment'指定でそれぞれリクエスト
           結果をマージしたObjectStreamで返す。 */
        const
            retStream =_genSimpleStream(),
            pass = new Set();

        _getCategoryStream(cntxt, 'income')
            .on('error', (err) => {
                retStream.emit('error', err);
            })
            .on('data', (chunk) => {
                pass.add(chunk.id);
            })
            .on('end', () => {
                _getCategoryStream(cntxt, 'payment', pass)
                    .on('error', (err) => {
                        retStream.emit('error', err);
                    })
                    .pipe(retStream,  { end: true });
            })
            .pipe(retStream,  { end: false });

        return retStream;
    }

    function getGenre(cntxt, mode) {
        /* 2016.3.23
            zaim apiに以下のＢＵＧ（？）
             - modeがフィルターとして働いていない。
             - modeに（null,undefined,payment）のいずれを指定しても同じ結果
        */
        let url;
        if (mode !== 'payment' && mode !== 'income' && mode !== undefined && mode !== null) {
            return Promise.reject(new Error('bad mode value!'));
        }
        url = genre_url + '?' + querystring.stringify({
            mapping: 1,
            mode: mode
        });
        return httpGet(cntxt, url);
    }

    function getGenreUtil(cntxt) {
        /* modeを'income','payment'指定でそれぞれリクエスト
           結果をマージして返す */
        const
            dict = new Map();

        return co(function* () {
            const ret = yield ['income', 'payment'].map((mode) => {
                return getGenre(cntxt, mode).then((ret) => {
                    return ret.genres;
                });
            });
            ret.forEach((genres) => {
                genres.forEach((gnr) => {
                    dict.set(gnr.id, gnr);
                });
            });
            return dict.values();
        });
    }

    function getCategoryDict(cntxt) {
        /* category - genres をMapで返す */
        const
            dict = new Map(),
            ctgStrm = getCategoryByStream(cntxt);

        return co(function* () {
            yield new Promise((resolve, reject)=>{
                ctgStrm.on('data', (ctg) => {
                    try {
                        dict.set(ctg.id, {
                            category: ctg,
                            genres: new Map()
                        });
                    } catch (err) {
                        reject(err);
                    }
                });

                ctgStrm.on('end', () => {
                    resolve();
                });
            });

            return dict;
        });
    }


    function getAccount(cntxt, mode) {
        let url;
        if (mode !== 'payment' && mode !== 'income' && mode !== undefined && mode !== null) {
            return Promise.reject(new Error('bad mode value in getAccount'));
        }
        url = account_url + '?' + querystring.stringify({
            mapping: 1,
            mode: mode
        });
        return httpGet(cntxt, url);
    }

    function makeFirstDayString(dayString) {
        const dayArray = dayString.split('-');
        return [dayArray[0], dayArray[1], '01'].join('-');
    }
    function preZero(num) {
        if (num > 99) {
            throw Error('too large number. 99 < ' + num);
        }
        return ('00' + num).slice(-2);
    }
    function makeNowDayString() {
        const now = new Date();
        return [
            String(now.getFullYear()),
            preZero(now.getMonth() + 1),
            preZero(now.getDate())
        ].join('-');
    }
    function arrayConcat(a, b) {
        return Array.prototype.push.apply(a, b);
    }

    function _Url_for_getMoney(cntxt, startDate, endDate, limitNum, page) {

        if (startDate === undefined) {
            startDate = makeNowDayString();
        }
        if (endDate === undefined) {
            endDate = startDate;
            startDate = makeFirstDayString(endDate);
        }

        return money_url + '?' + querystring.stringify({
            mapping: 1,
            start_date: startDate,
            end_date: endDate,
            page: page,
            limit: limitNum
/*
            mapping: required. set 1
            category_id: narrow down by category_id
            genre_id: narrow down by genre_id
            mode: narrow down by type (pay or income)
            order: sort by id or date (default : date)
            start_date: the first date (Y-m-d format)
            end_date: the last date (Y-m-d format)
            page: number of current page (default 1)
            limit: number of items per page (default 20, max 100)
            group_by: if you set as "receipt_id", Zaim makes the response group by the receipt_id (option)
*/
        });
    }

    function getMoney(cntxt, startDate, endDate) {
        const limitNum = 100,
            url = _Url_for_getMoney.bind(null, cntxt, startDate, endDate, limitNum);

        return co(function *() {
            let data,
                page = 1;
            const moneys = [];

            do {
                data = yield  httpGet(cntxt, url(page));
                arrayConcat(moneys, data.money);
                page +=1;
            } while (data.money.length === limitNum);

            return moneys;
        });
    }

    function getMoneybyStream(cntxt, startDate, endDate, limitNum) {
        const
            url = _Url_for_getMoney.bind(null, cntxt, startDate, endDate, limitNum);

        function getPage(page) {
            const jsonStrm = require('JSONStream').parse('money.*');
            genRequest(cntxt, url(page))
                .on('response', (message) => {
                    message.pipe(jsonStrm);
                })
                .end(); // exec request

            return jsonStrm;
        }
        return {
            getPage: getPage
        };
    }

    function counterStream () {
        const
            tStream = new stream.Transform({
                objectMode: true
            }),
            cntPrms = new Promise((resolve, reject) => {
                let count = 0;
                tStream._transform = function (chunk, encoding, callback) {
                    try {
                        tStream.push(chunk);
                        count += 1;
                    } catch (err) {
                        reject(err);
                    }
                    callback();
                };
                tStream._flush = function (cb) {
                    try {
                        resolve(count);
                    } catch (err) {
                        reject(err);
                    }
                    cb();
                };
            });
        return {
            stream: function () {return tStream;},
            promise:  function () {return cntPrms;}
        };
    }
    function zaimMoneyStream(cntxt, startDate, endDate) {
        const
            limitNum = 100,
            retStream = _genSimpleStream(),
            moneyStrm = getMoneybyStream(cntxt, startDate, endDate, limitNum);


        co(function* (){
            let page = 1,
                count;

            do{
                const counter = counterStream();

                // console.log(`request page-${page}`);
                moneyStrm.getPage(page)
                    .pipe(counter.stream())
                    .pipe(retStream, {end: false});
                count = yield counter.promise();
                // console.log(`page-${page} count:${count}`);
                page += 1;
            } while(count === limitNum);
            retStream.end();
        });

        return retStream;
    }

    function makeZaim(params) {
        const cntxt = {},
            selfIF = {};

        cntxt.selfIF = selfIF;
        if (!params.consumerKey || !params.consumerSecret) {
            throw new Error('ConsumerKey and secret must be configured.');
        }
        cntxt.consumerKey = params.consumerKey;
        cntxt.consumerSecret = params.consumerSecret;
        cntxt.callback = params.callback;

        cntxt.client = new oauth.OAuth(
            request_url,
            access_url,
            cntxt.consumerKey,
            cntxt.consumerSecret,
            '1.0A',
            cntxt.callback,
            'HMAC-SHA1'
        );

        return Object.assign(selfIF, {
            getAccessToken: getAccessToken.bind(null, cntxt),
            setAccessToken: setAccessToken.bind(null, cntxt),

            getUser: getUser.bind(null, cntxt),
            getMoney: getMoney.bind(null, cntxt),
            zaimMoneyStream: zaimMoneyStream.bind(null, cntxt),

            getCategory: getCategory.bind(null, cntxt),
            getCategoryByStream: getCategoryByStream.bind(null, cntxt),

            getGenre: getGenre.bind(null, cntxt),
            getGenreUtil: getGenreUtil.bind(null, cntxt),
            getCategoryDict: getCategoryDict.bind(null, cntxt),

            getAccount: getAccount.bind(null, cntxt)
        });
    }
    return makeZaim;


})();
