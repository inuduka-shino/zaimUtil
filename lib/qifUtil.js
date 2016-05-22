/*eslint-env es6: true, node: true, browser: false */
/*global Promise */

/* qifUtil.js
   qif writer
   written on 2016.5.22
*/

module.exports = (function () {
    'use strict';
    const qif = require('qif'),
        dateString = require('./dateString');


    function genQifData() {
        const
            transactions = {
                cash: [
                ]
            },
            nowStr = dateString.makeDayString(new Date(), 'YYYYMMDDhhmmss');

        let transIdBase,
            transListCount = 0;

        transIdBase = 'ZAIM' + nowStr;

        function addTrans(transInfo) {
            /* transInfo = {
                id,
                type, 'DEBIT' or 'CREDIT',
                date, '2016-01-15',
                name,
                amount, 9999
                memo
            }
            */

            const // tranDate = transInfo.date.split('-').join('') + '000000[+9:JST]',
                transObj = {
                      /*
                      {
                        date: '3/7/2014',
                        amount: -213.39,
                        payee: 'Kroger',
                        memo: 'this is a memo',
                        category: 'Groceries',
                        checknumber: 123
                      },
                      {
                        date: '3/6/2014',
                        amount: -8.16,
                        payee: 'Starbucks',
                        category: 'Dining Out:Coffee',
                        checknumber: 456
                    } */

                    date: transInfo.date,
                    amount: transInfo.amount,
                    payee: transInfo.payee,
                    memo: transInfo.memo,
                    category: transInfo.category,
                    checknumber: transInfo.checknumber
                };

            if (transInfo.id === undefined) {
                transObj.checknumber = transIdBase + ('000' + transListCount).slice(-4);
            }

            transactions.cash.push(transObj);
            transListCount += 1;
        }
        function serialize() {

            return qif.write(transactions);
        }

        return {
            addTrans: addTrans,
            serialize: serialize
        };
    }

    return genQifData;

}());
