/*eslint no-console: 0 */

(function () {
    'use strict';
    const // config = require('./config'),
        fs = require('fs'),
        sampleData = require('./ofxInfo/sample');

    let ofxData;


    function genOfxData(info) {
        const ofx = require('node-ofx'),
            dateString = require('./lib/dateString'),
            ofxInfo = require('./ofxInfo/info'),
            header = ofxInfo.header,
            body = ofxInfo.body,
            transList = [],
            nowStr = dateString.makeDayString(new Date(), 'YYYYMMDDhhmmss');

        let transIdBase,
            transListCount = 0,
            firstDate,
            lastDate,
            lastAmount;


        transIdBase = 'ZAIM' + nowStr;
        body.SIGNONMSGSRSV1.SONRS.DTSERVER =  + '[+9:JST]';
        Object.assign(body.SIGNONMSGSRSV1.SONRS.FI, {
            ORG: info.fiOrg,
            FID: info.fiFid
        });
        Object.assign(body.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKACCTFROM, {
            BANKID: info.bankID,
            BRANCHID: info.bankCID,
            ACCTID: info.acctID,
            ACCTTYPE: info.acctType
        });

        function addTrans(transInfo) {
            /* transInfo = {
                id,
                type, 'DEBIT' or 'CREDIT'

            }
            */
            const tranDate = transInfo.DTPOSTED;
            let transId;

            if (transInfo.id === undefined) {
                transId = transIdBase + ('000' + transListCount).slice(-4);
            } else {
                transId = transIdBase + transInfo.id;
            }
            transList.push({
                TRNTYPE: transInfo.type,
                DTPOSTED: tranDate,
                TRNAMT: transInfo.amount,
                FITID: transId,
                NAME: transInfo.name,
                MEMO: transInfo.memo
            });
            transListCount += 1;
            if (tranDate < firstDate || firstDate === undefined ) {
                firstDate = tranDate;
            }
            if (tranDate > lastDate || lastDate === undefined ) {
                lastDate = tranDate;
            }
        }
        function serialize() {
            lastAmount = 99999;

            body.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.DTSTART = firstDate;
            body.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.DTEND = lastDate;

            Array.prototype.push.apply(
                body.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN,
                transList
            );

            body.BANKMSGSRSV1.STMTTRNRS.STMTRS.LEDGERBAL.BALAMT = String(lastAmount);
            body.BANKMSGSRSV1.STMTTRNRS.STMTRS.LEDGERBAL.DTASOF = lastDate;

            return ofx.serialize(header, body);
        }

        return {
            addTrans: addTrans,
            serialize: serialize
        };
    }

    ofxData = genOfxData(sampleData);
    sampleData.transactions.forEach((data) => {
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

}());
