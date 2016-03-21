/*eslint no-console: 0 */

(() => {
    'use strict';
    const memo = require('./lib/memo.js')('test.json');
    memo.load()
    .then((ppp) => {
        console.dir(ppp.info);
        if  (ppp.info.x === undefined) {
            ppp.info.x = 0;
        }
        ppp.info.x += 1;
        return ppp.save();
    })
    .then(() => {
        console.log('saved!');
    });
})();
