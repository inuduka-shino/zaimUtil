/*eslint no-console: 0 */

module.exports = {
    header: {
        OFXHEADER: '100',
        DATA: 'OFXSGML',
        VERSION: '103',
        SECURITY: 'NONE',
        ENCODING: 'UTF-8',
        CHARSET:  'UTF-8', //'1252',
        COMPRESSION: 'NONE',
        OLDFILEUID: 'NONE',
        NEWFILEUID: 'NONE'
    },

    // ref: http://www.exactsoftware.com/docs/DocView.aspx?DocumentID=%7B6e02f9a5-ee40-4d2f-b8ea-4bee57825907%7D
    body: {
        SIGNONMSGSRSV1: {
            SONRS: {
                STATUS: {
                    CODE: '0',
                    SEVERITY: 'INFO'
                },
                // ?? DTCLIENT: 'value',
                // DTSERVER: 'YYYYMMDDhhmmss[+9:JST]',
                // ?? USERID: 'user id',
                // ?? USERPASS: 'password',
                LANGUAGE: 'JPN',
                FI: {
                //    ORG: '<name>',
                //    FID: '<id>'
                }
                // ?? APPID: 'XXXXX',
                // ?? APPVER: '010000',
                // ?? CLIENTUID: 'needed by some places'
            }
        },

        BANKMSGSRSV1: {
            STMTTRNRS: {
                TRNUID: '0',
                STATUS: {
                    CODE: '0',
                    SEVERITY: 'INFO'
                },
                STMTRS: {
                    CURDEF: 'JPY',
                    BANKACCTFROM: {
                    //     BANKID: 'bank id',
                    //     BRANCHID: 'bank branch id',
                    //     ACCTID: 'account id',
                    //     ACCTTYPE: 'SAVINGS' // account type
                    },
                    BANKTRANLIST: {
                        DTSTART: null,
                        DTEND: null,
                        STMTTRN: []
                    },
                    LEDGERBAL: {
                        // BALAMT: '<amount>',
                        // DTASOF: 'YYYYMMDDhhmmss[+9:JST]'
                    }
                }
            }
        }

    }
};
