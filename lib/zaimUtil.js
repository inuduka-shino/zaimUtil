/*eslint no-console: 1 */

module.exports = (() => {
    'use strict';

    // Provider info
    const oauth = require('oauth'),
        querystring = require('querystring'),
        co = require('co');


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

    function getCategory(cntxt, mode) {
        let url;
        if (mode !== 'payment' && mode !== 'income') {
            return Promise.reject(new Error('bad mode value!'));
        }
        url = category_url + '?' + querystring.stringify({
            mapping: 1,
            mode: mode
        });
        return httpGet(cntxt, url);
    }
    function getGenre(cntxt, mode) {
        let url;
        if (mode !== 'payment' && mode !== 'income') {
            return Promise.reject(new Error('bad mode value!'));
        }
        url = genre_url + '?' + querystring.stringify({
            mapping: 1,
            mode: mode
        });
        return httpGet(cntxt, url);
    }
    function getAccount(cntxt, mode) {
        let url;
        if (mode !== 'payment' && mode !== 'income') {
            return Promise.reject(new Error('bad mode value!'));
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

    function createRequestData (cntxt, startDate, endDate) {
        const startPageNum = 1,
            limitNum = 100,
            url = _Url_for_getMoney.bind(null, cntxt, startDate, endDate, limitNum),
            queue = [];

        let preStreamPrms = Promise.resolve(startPageNum),
            compFlag = false;

            preStreamPrms.then((page) => {
                console.log('request page:' + page);

                let jsonStrm,
                    count = 0;

                if (page === null) {
                    retStream.push(null);
                    return;
                }

                jsonStrm = require('JSONStream').parse('money');
                jsonStrm.on('data', (moneys) => {
                    count += moneys.length;
                    // console.log(`jsonStrm data event page:${page} total count:${count} length:` + moneys.length);
                    if (wait === undefined) {
                        wait = waiteQueue(moneys, retStream.push.bind(retStream));
                    } else {
                        wait.add(moneys);
                    }
                });
                preStreamPrms = new Promise ((resolve) => {
                    jsonStrm.on('end', () => {
                        console.log(`jStream End event page:${page}`);
                        console.log('count:%d - limitNum:%d', count, limitNum);

                        if (count === limitNum) {
                            resolve(page + 1);
                            console.log('next page:' + (page + 1));
                        } else {
                            retStream.push(null);
                            resolve(null);
                            console.log(`page ${page} is last`);
                        }
                    });
                });
                preStreamPrms.then(() => {
                    wait.restart();
                });

                genRequest(cntxt, url(page))
                    .on('response', (message) => {
                        console.log('response event for page-' + page);
                        message.pipe(jsonStrm);
                    })
                    .end(); // exec request
            });


    }


    function createQueue (get) {
        const queQueue = [];
        let
            compFlag = false,
            waitPrms;

        co(function* (){
            let page = 1,
                contFlag = true;
            do {
                yield waitPrms = get(page).then((elms) => {
                    if (elms === null) {
                        queQueue.push(null);
                        contFlag = false;
                    } else {
                        queQueue.push(elms);
                    }
                });
                page += 1;
            } while(contFlag);

        });

        function read() {
            return co(function*  () {
                let queue;
                if (compFlag === true) {
                    return null;
                }

                if (queQueue.length === 0) {
                    yield waitPrms;
                }
                queue = queQueue[0];
                if (queue !== null && queue.length === 0) {
                    queue = queQueue.shift();
                }
                if (queue === null) {
                    compFlag = true;
                    return null;
                } else {
                    return queue.shift();
                }
            });
        }
        return {
            read
        };
    }

    function zaimMoneyStream(cntxt, startDate, endDate) {
        const
            retStream = new require('stream').Readable({
                objectMode: true
            }),
            requestData = createRequestData(cntxt, startDate, endDate),
            queue = createQueue(requestData.get);

        retStream._read = function () {
            queue.read().then((elm) => {
                // last elm is null
                retStream.push(elm);
            });
        };

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
            getGenre: getGenre.bind(null, cntxt),
            getAccount: getAccount.bind(null, cntxt)
        });
    }
    return makeZaim;

    function waiteQueue(seq0, push) {
        const seqArray = [seq0];
        let
            arrayNum = 1,
            arrayIndex = 0,
            seqNum,
            seqIndex,
            continueFlag = false;
        console.log('in queue ' + seq0.length);

        function add (newSeq) {
            console.log('add queue ' + newSeq.length);

            seqArray.push(newSeq);
            arrayNum += 1;
        }
        function restart() {
            let ret = 'compleat';
            //console.log('restart!');
            for (; arrayIndex < arrayNum; arrayIndex += 1) {
                const seq = seqArray[arrayIndex];
                if (!continueFlag) {
                    seqNum = seq.length;
                    seqIndex = 0;
                }
                for (; seqIndex < seqNum; seqIndex += 1) {
                    const stat = push(seq[seqIndex]);
                    if (stat === false) {
                        ret = 'uncompleat';
                        continueFlag = true;
                        break;
                    }
                }
                if (ret === 'uncompleat') {
                    break;
                }
            }
            return ret;
        }
        return {
            restart: restart,
            add: add
        };
    }



})();
