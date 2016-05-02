/* config.js */

module.exports = (() => {
    'use strict';
    return {
        consumerKey: 'consumerKey',
        consumerSecret: 'consumerSecret',
        categoryNames: {
            // zaim上のcategory nameがAPIに反映されないので、
            // category_id -> name マッピングをconfigで設定
            // 101: 食費
            109: '書籍', // '教育・教養'
            113: '理容', //'税金'
            // 102 日用雑貨
            104: '洗濯',
            111: '衣服',
            110: '医療',
            // 103, '交通',
            // 108, 'エンタメ'
            107: '交際・寄付',
            999: 'dummy'
        }
    };
})();
