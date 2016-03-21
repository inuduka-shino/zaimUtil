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
            console.log('*getCategory*');
            const categories =  yield [null, undefined, 'income', 'payment'].map((mode) =>{
                return zaim.getCategory(mode).then((data)=>{
                    return data.categories.filter((category) => (category.active === 1));
                });
            });
            {
                const modenames = ['null', 'undefined', 'income', 'payment'];
                const dict = {};
                for (let idx = 0; idx < 4; idx += 1) {
                    const
                        catgs = categories[idx],
                        modeName = modenames[idx];
                    let count = 0;
                    catgs.forEach((catg) => {
                        if (dict[catg.id] === undefined) {
                            dict[catg.id] = {};
                        }
                        dict[catg.id][modeName] = modeName;
                        count += 1;
                    });
                    console.log(count);
                }
                console.dir(dict);
            }
            //console.dir(categories);
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
