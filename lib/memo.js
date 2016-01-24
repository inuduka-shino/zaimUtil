/*eslint-env es6: true, node: true, browser: false */
/*global Promise */

/* memo.js
   writeable json file module
   written on 2016.1.24
*/

module.exports = (function () {
    'use strict';
    const fsUtil = require('./fsUtil');

    function save(cntxt) {
        return fsUtil.writeFile(cntxt.path, JSON.stringify(cntxt.info)).then(() => {
            return cntxt.info;
        });
    }
    function load(cntxt) {
        return fsUtil.readFile(cntxt.path).then((readInfo) => {
            return {
                info: cntxt.info = JSON.parse(readInfo),
                save: save.bind(null, cntxt)
            };
        }).catch((err) => {
            if (err.code === 'ENOENT') {
                return {
                    info: {},
                    save: save.bind(null, cntxt)
                };
            } else {
                throw err;
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
