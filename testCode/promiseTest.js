/*eslint no-console: 0 */

(() => {
    'use strict';
    function tryReject(reject, cb) {
        return  function () {
            try {
                cb.apply(null, arguments);
            } catch (err) {
                reject(err);
            }

        };
    }
    function generateTryBlock(reject) {
        return tryReject.bind(null, reject);
    }

    function timeOutWithArg(cb) {
        setTimeout(
            () => { cb('ARGMENT', 'ARGMENT2');},
            500
        );
    }


    new Promise((resolve, reject) => {
        const tryBlock = generateTryBlock(reject);
        setTimeout(tryBlock(
            () => {
                console.log('test Error');
                // throw new Error('test');
                reject(new Error('reject test'));
            }
        ),500);
    }).catch((err) => {
        console.log('ERROR!');
        console.log(err.stack);
    }).then(() =>{
        console.log('end');
    }).then(() => {

        return new Promise((resolve, reject) => {
            const tryBlock = generateTryBlock(reject);
            timeOutWithArg(tryBlock(
                (arg1, arg2) => {
                    console.log('test Error2');
                    console.log(arg1);
                    console.log(arg2);
                    // throw new Error('test');
                    reject(new Error('reject test3'));
                }
            ));
        });

    }).catch((err) => {
        console.log('ERROR!!');
        console.log(err.stack);
    });




})();
