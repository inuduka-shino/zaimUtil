/*eslint no-console: 0 */
/*eslint strict: 2, no-var: 2,  prefer-const: 2,  prefer-arrow-callback: 2  */
/*eslint-env es6*/

(() => {
    'use strict';
    const config = require('./config'),
        ZaimUtil = require('./zaimUtil');

    ZaimUtil.getAccessToken(config);
})();
