/*eslint no-console: 0 */

(() => {
    'use strict';
    const
        co = require('co'),
        genAccessableZaim = require('./lib/genAccessableZaim'),
        memoUtil = require('./lib/memo');

    // main
    co(function *() {
        let zaim;
        const config = require('./config');

        console.log('start');

        {
            const memo = yield memoUtil('./memo.json').load();
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
        }

        {
            const userInfo = yield zaim.getUser();
            console.log('OK:');
            console.dir(userInfo);
        }
    }).catch((err) => {
        console.error('*** ERROR ***');
        if (err.stack === undefined) {
            console.error(err);
        } else {
            console.error(err.stack);
        }
    });

})();
