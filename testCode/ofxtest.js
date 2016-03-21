/*eslint no-console: 0 */

(() => {
    'use strict';
    const
        fs = require('fs'),
        genOfxData = require('./lib/ofxUtil'),
        sampleData = setSampleData();

    let ofxData;

    ofxData = genOfxData({
        fiOrg: 'ZAIM-INFORMATON',
        fiFid: 'ZAIM0001',
        bankID: 'ZAIM0001B001',
        bankCID: 'BC001',
        acctID: 'ACCT0001',
        acctType: 'SAVINGS'
    });
    sampleData.forEach((data) => {
        ofxData.addTrans(data);
    });

    console.log('writeing...');
    fs.writeFile(
        'ofxInfo/sampleOutput.ofx',
        ofxData.serialize(),
        {
            encoding: 'utf8'
        },
        () => {
            console.log('wrote!');
        }
    );

    function setSampleData() {
        return [
            {
                id: 'test00',
                type: 'DEBIT',
                date: '2016-01-14',
                amount: -9001,
                name: 'AC:T2',
                memo: 'めもめも1'
            },
            {
                id: 'test01',
                type: 'DEBIT',
                date: '2016-01-15',
                amount: -101,
                name: 'AC:X42',
                memo: 'めもめも2'
            },
            {
                id: 'test02',
                type: 'CREDIT',
                date: '2016-01-15',
                amount: 101,
                name: 'CT:A00',
                memo: '入金'
            },
            {
                id: 'test03',
                type: 'DEBIT',
                date: '2016-01-16',
                amount: -6501,
                name: 'AC:T2',
                memo: 'めもめも3'
            }
        ];
    }

})();
