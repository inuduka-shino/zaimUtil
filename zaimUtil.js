/*eslint no-console: 0 */
/*eslint no-var: 2,  prefer-const: 2,  prefer-arrow-callback: 2  */
/*eslint-env es6*/

module.exports = (function () {
    'use strict';
    const Zaim = require('zaim');

    function arrayConcat(a, b) {
        return Array.prototype.push.apply(a, b);
    }

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

    function getAuthorizationUrl(zaim) {
        return new Promise((resolve) =>  {
            zaim.getAuthorizationUrl((url) => {
                resolve(url);
            });
        });
    }
    function getOAuthAccessToken(zaim, pin) {
        return new Promise((resolve, reject) => {
            zaim.getOAuthAccessToken(
                pin,
                (err, token, secret, results) => {
                    if (err !== undefined) {
                        resolve({
                            token,
                            secret,
                            results
                        });
                    } else {
                        reject(err);
                    }
                }
            );
        });
    }

    function getAccessToken(config) {
        const zaim = new Zaim({
            consumerKey: config.consumerKey,
            consumerSecret: config.consumerSecret,
            callback: config.serviceURL
        });

        Promise.resolve()
            .then(() => {
                console.log('AuthorizationUrl');
                return getAuthorizationUrl(zaim);
            })
            .then((url) => {
                console.log('return AuthorizationUrl');
                console.log(url);
                console.log('input verifier:');
                return readOneline();
            })
            .then((verifier) => {
                console.log('getOAuthAccessToken');
                return getOAuthAccessToken(zaim, verifier);
            })
            .then((info) => {
                console.log('access token');
                console.log(info.token); //access token
                console.log('access token secret');
                console.log(info.secret); //access token secret
                //console.dir(info.results);
            })
            .catch((err) => {
                console.error('error !');
                console.error(err.stack);
            });
    }

    function requestGetMoney(zaim, param, page) {
        param.page = page;
        return new Promise((resolve, reject) => {
            zaim.getMoney(param, (data, err) => {
                if (err === undefined) {
                    resolve(data);
                } else {
                    reject(err);
                }
            });
        });
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

    function getMoneyInfo(config, endDay, startDay) {
        const itemNumPerPage = 6,
            param = {
                //category_id: , //'narrow down by category_id',
                //genre_id: undefined, // 'narrow down by genre_id',
                //type: 'income', //'narrow down by type (pay or income)',
                order: 'date', // 'sort by id or date (default : date)',
                // start_date: 'the first date (Y-m-d format)',
                // end_date: 'the last date (Y-m-d format)',
                page: 1, //page: 'number of current page (default 1)',
                limit: itemNumPerPage //'number of items per page (default 20, max 100)'
            };
        let zaim;

        if (endDay === undefined) {
            endDay = makeNowDayString();
        }
        if (startDay === undefined) {
            startDay = makeFirstDayString(endDay);
        }
        console.log(startDay);
        console.log(endDay);
        param.start_date = startDay;
        param.end_date = endDay;
        zaim = new Zaim({
            consumerKey: config.consumerKey,
            consumerSecret: config.consumerSecret,
            // option params
            accessToken:  config.accessToken,
            accessTokenSecret: config.accessTokenSecret,
            callback: config.serviceURL
        });

        return new Promise((resolve, reject) => {
            const moneys = [];

            (function loop(page) {
                // console.log('request GetMoney:page-' + page);
                requestGetMoney(zaim, param, page).then((data) => {
                    // console.log('return GetMoney:item Num - ' + data.money.length);
                    arrayConcat(moneys, data.money);
                    if (data.money.length === itemNumPerPage) {
                        // next request
                        page += 1;
                        loop(page);
                    } else {
                        resolve(moneys);
                    }
                }).catch((err) => {
                    reject(err);
                });
            })(1); // start page = 1
        })
        .catch((err) => {
            console.error('getMoneyInfo error !');
            console.error(err.stack);
        });

    }


    return {
        getAccessToken,
        getMoneyInfo
    };
}());
