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

        { // getCategory & getGenre
            console.log('*getCategoryByStream*');
            let count = 1;
            zaim.getCategoryByStream()
                .on('data', (chunk) => {
                    console.log(`${count} ${chunk.id} ${chunk.mode} ${chunk.name}`);
                    count += 1;
                })
                .on('end', () => {
                    console.log('category End');
                });
        }


        /*
        { // getCategory & getGenre
            console.log('*getCategoryUtil*');
            const catgDict =  yield zaim.getCategoryDict();
            console.dir(catgDict.get(110).category);
            console.dir(catgDict.get(114).genres.get(11409));
        }
        */
    }).catch((err) => {
        console.error('*** ERROR ***');
        if (err.stack === undefined) {
            console.error(err);
        } else {
            console.error(err.stack);
        }
    });

})();
