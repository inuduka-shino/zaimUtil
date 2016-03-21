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

        { // getAccount
            console.log('*getAccount*');
            const accounts =  yield zaim.getAccount().then((data)=>{
                return data.accounts.filter((account) => (account.active === 1));
            });
            console.dir(accounts);
        }
        { // getCategory
            console.log('*getCategory*');
            const categories =  yield zaim.getCategory().then((data)=>{
                return data.categories.filter((category) => (category.active === 1));
            });
            console.dir(categories);
        }
        { // getGenre
            console.log('*getGenre*');
            const genres =  yield zaim.getGenre().then((data)=>{
                return data.genres.filter((genre) => (genre.active === 1));
            });
            console.dir(genres);
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
