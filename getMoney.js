/*eslint no-console: 0 */

(() => {
    'use strict';
    const config = require('./config'),
        makeZaim = require('./lib/zaimUtil.js');

    console.log('getMoney start');
    makeZaim(config).getMoney('2015-12-31').then((moneys) => {
        console.log('OK');
        console.log(moneys.length);
        console.dir(moneys);
    }).catch((err) => {
        console.error(err);
        if (err.stack !== undefined) {
            console.error(err.stack);
        }
    });
})();
