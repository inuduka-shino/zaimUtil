/*eslint no-console: 0 */

(() => {
    'use strict';
    const co = require('co');


    co(function* () {
        const result = yield Promise.resolve(true)
            .then(() => {throw new Error('test exception');});
        // .catch(() => { return 'error!';});
        //throw new Error('err');
        console.log('return!');
        console.dir(result);
        return result;
    }).then(
        (value) => {
            console.log(value);
        },
        (err) => {
            console.log('error process!');
            console.error(err.stack);
        }
    );
})();
