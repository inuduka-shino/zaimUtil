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

        { // getCategory
            console.log('*getCategoryUtil*');
            const catgDict = {
                payment: new Map(),
                income: new Map()
            };
            const categories =  yield zaim.getCategoryUtil();
            for (const ctg of categories) {
                catgDict[ctg.mode].set(ctg.id, ctg);
            }
            console.dir(catgDict['payment'].get(110));
        }
        { // getGenre
            console.log('*getGenreUtil*');
            const genreDict = new Map();
            const genres =  yield zaim.getGenreUtil();
            for (const gnr of genres) {
                console.log(gnr);
                genreDict.set(gnr.id, gnr);
            }
            console.dir(genreDict.get(11409));
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
