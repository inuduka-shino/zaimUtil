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
            console.log('*getCategoryByStream*');
            yield new Promise((resolve, reject) =>{
                // getCategory & getGenre
                let count = 1;
                zaim.getCategoryByStream()
                    .on('data', (chunk) => {
                        console.log(`${count} ${chunk.id} ${chunk.mode} ${chunk.name}`);
                        count += 1;
                    })
                    .on('end', () => {
                        resolve();
                    })
                    .on('error', (err) => {
                        reject(err);
                    });
            });
            console.log('getCategoryByStream End');
        }

        { // getCategoryDict
            console.log('*getCategoryDict*');
            const catgDict =  yield zaim.getCategoryDict();
            //console.dir(catgDict);
            console.dir(catgDict.get(110).category);
            console.dir(catgDict.get(114).genres.get(11409));
            //console.dir(catgDict.get(114).genres);
            console.log('getCategoryDict End');
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
