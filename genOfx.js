/*eslint no-console: 0 */

(() => {
    'use strict';
    const config = require('./config'),
        fs = require('./lib/fsUtil'),
        dateString = require('./lib/dateString'),
        makeZaim = require('./lib/zaimUtil'),
        genOfxData = require('./lib/ofxUtil'),
        ofxData = genOfxData({
            fiOrg: 'ZAIM-INFORMATON',
            fiFid: 'ZAIM0001',
            bankID: 'ZAIM0001B001',
            bankCID: 'BC001',
            acctID: 'ACCT0001',
            acctType: 'SAVINGS'
        });

    let
        period,
        targetMonth;

    targetMonth = (() => {
        // comand line argment
        const target = process.argv[2];
        if (/^[0-9]{4}-[0-9]{1,2}$/.test(target)) {
            return target;
        } else if (target === undefined) {
            return null;
        }
        throw new Error(`argmennt is bad format!("YYYY-MM" !== "${target}")`);
    })();

    period = (() => {
        let targetDay;
        if (targetMonth === null) {
            targetDay = new Date();
        } else {
            targetDay = new Date(targetMonth);
        }

        return {
            start: dateString.makeFirstDayString(targetDay),
            end: dateString.makeLastDayString(targetDay)
        };
    })();

    console.log('getMoney start');
    makeZaim(config).getMoney(period.start, period.end).then((moneys) => {
        let fileImage,
            writeBackupPromise;

        console.log('OK');
        console.log(moneys.length);
        //console.dir(moneys);
        console.log('file writeing...');
        fileImage = JSON.stringify(moneys, null, '  ');

        // TODO: timestamp filename
        writeBackupPromise = fs.writeFile('work/moneyTest.txt', fileImage);
        moneys.forEach((moneyInfo) => {
            if (moneyInfo.mode === 'payment') {
                ofxData.addTrans({
                    id: 'ZAIM00A' + moneyInfo.id,
                    type: 'DEBIT',
                    date: moneyInfo.date,
                    amount: -1 * Number(moneyInfo.amount),
                    name: [moneyInfo.category_id, moneyInfo.genre_id].join('-'),
                    memo: moneyInfo.id
                });
            } else {
                console.log('pass transaction:' + moneyInfo.id);
                console.log('unkown mode:' + moneyInfo.mode);
            }
        });
        return writeBackupPromise;
    })
    .then(() => {
        console.log('backuup file wrote.');
        return fs.writeFile(
            'ofxInfo/Output.ofx',
            ofxData.serialize()
        );
    })
    .then(() => {
        console.log('ofx fiel wrote!');
    })
    .catch((err) => {
        console.error(err);
        if (err.stack !== undefined) {
            console.error(err.stack);
        }
    });
})();
