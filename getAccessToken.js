/*eslint no-console: 0 */

(() => {
    'use strict';
    const config = require('./config'),
        makeZaim = require('./lib/zaimUtil');
    const zaim = makeZaim(config);

    function readOneline() {
        const reader = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve) => {
            reader.on('line', (line) => {
                reader.close();
                resolve(line.trim());
            });
        });
    }

    function inputVerifier(url) {
        console.log('以下のURLで認証');
        console.log(url);
        console.log('Input Verifier:');
        return readOneline();
    }

    zaim.getAccessToken(inputVerifier)
        .then((data) => {
            console.log('OK');
            console.dir(data);
        })
        .catch((err) => {
            console.log('error');
            console.error(err);
            if (err.stack !== undefined) {
                console.error(err.stack);
            }
        });
})();
