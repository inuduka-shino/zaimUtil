/*eslint no-console: 0 */

(() => {
    'use strict';
    const
        co = require('co'),
        genAccessableZaim = require('../lib/genAccessableZaim'),
        memoUtil = require('../lib/memo');

    // main
    co(function *() {
        let zaim;
        const config = require('../config');

        console.log('start');

        {
            const memo = yield memoUtil('../memo.json').load();
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


        { // getCategoryDict
            const catgoryDict = yield zaim.getCategoryDict(config.categoryNames);
            const keys =Array.from(catgoryDict.keys()).sort((id1, id2) => {
                const [ctg1, ctg2] = [id1, id2].map((id) => {
                    return catgoryDict.get(id).category;
                });
                if (ctg1.mode === ctg2.mode) {
                    if (ctg1.sort === ctg2.sort) {
                        return 0;
                    }
                    return ctg1.sort > ctg2.sort?1:-1;
                }
                return ctg1.mode > ctg2.mode?1:-1;
            });
            for(const id of keys) {
                const info = catgoryDict.get(id);
                console.dir({
                    sort: info.category.sort,
                    id: id,
                    name: info.category.name,
                    uname: info.category.uname
                });
            }
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
