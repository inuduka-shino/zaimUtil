/*eslint-env es6: true, node: true, browser: false */
/*eslint no-console: 1 */
/*global Promise */

/* memo.js
   writeable json file module
   written on 2016.1.24
*/

module.exports = (function () {
    'use strict';
    const fsUtil = require('./fsUtil');

    function save(cntxt) {
        return fsUtil.writeFile(cntxt.path, JSON.stringify(cntxt.info))
        .then(() => {
            return cntxt.info;
        })
        .catch((err) => {
            const newErr = new Error('error to write memo file');
            // console.dir(orgErr);
            newErr.orgErr = err;
            throw newErr;
        });
    }

    function load(cntxt) {
        return fsUtil.readFile(cntxt.path).then((readInfo) => {
            readInfo = String(readInfo);
            if (readInfo === '') {
                readInfo = {};
            } else {
                cntxt.info = JSON.parse(readInfo);
            }
            return {
                info: cntxt.info,
                save: save.bind(null, cntxt)
            };
        }).catch((err) => {
            const newErr = new Error('error to read memo file');

            if (err.code === 'ENOENT') {
                return {
                    info: cntxt.info = {},
                    save: save.bind(null, cntxt)
                };
            } else {
                // console.dir(orgErr);
                newErr.orgErr = err;
                throw newErr;
            }
        });
    }

    function generate (path) {
        const cntxt = {
            path: path,
            info: {}
        };
        return {
            // save: save.bind(null, cntxt),
            load: load.bind(null, cntxt)
        };
    }

    return generate;
}());
