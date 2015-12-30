/* config.js */

module.exports = (function () {
    return {
        consumerKey: '',
        consumerSecret: '',
        requestTokenURL: 'https://api.zaim.net/v2/auth/request',
        authorizeURL: 'https://auth.zaim.net/users/auth',
        accessTokenURL: 'https://api.zaim.net/v2/auth/access'
    };
}());
