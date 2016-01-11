/*eslint no-console: 0 */

(() => {
    'use strict';
    const config = require('./config'),
        fs = require('./lib/fsUtil'),
        dateString = require('./lib/dateString'),
        makeZaim = require('./lib/zaimUtil.js');
    let period;

    period = (() => {
        const nowDay = new Date();

        return {
            start: dateString.makeFirstDayString(nowDay),
            end: dateString.makeLastDayString(nowDay)
        };
    })();

    console.log('getMoney start');
    makeZaim(config).getMoney(period.start, period.end).then((moneys) => {
        let fileImage;
        console.log('OK');
        console.log(moneys.length);
        //console.dir(moneys);
        console.log('file writeing...');
        fileImage = JSON.stringify(moneys, null, '  ');
        return fs.writeFile('moneyTest.txt', fileImage);
    })
    .then(() => {
        console.log('file wrote.');
    })
    .catch((err) => {
        console.error(err);
        if (err.stack !== undefined) {
            console.error(err.stack);
        }
    });
})();
