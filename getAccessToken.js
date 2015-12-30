/*eslint no-console: 0 */

(function () {
    var config = require('./config'),
        ZaimUtil = require('./zaimUtil');

    ZaimUtil.getAccessToken(config);

}());
