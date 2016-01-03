/*eslint no-console: 0 */

(() => {
    'use strict';
    const config = require('./config'),
        makeZaim = require('./lib/zaimUtil.js');

    console.log('start');
    makeZaim(config).getUser().then((data) => {
        console.log('OK');
        console.dir(data);
    }).catch((err) => {
        console.error(err);
        console.trace();
    });
})();
