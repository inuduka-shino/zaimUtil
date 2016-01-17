/*eslint-env es6: true, node: true, browser: false */
/*global Promise */

/* dateString.js
   date Rep Util
   written on 2016.1.11
*/

module.exports = (function () {
    'use strict';
    function preZero(num) {
        if (num > 99) {
            throw Error('too large number. 99 < ' + num);
        }
        return ('00' + num).slice(-2);
    }
    function makeDateInfo(yearStr) {
        const dateInfo = [yearStr];
        return {
            push: (term) => {
                dateInfo.push(preZero(term));
            },
            join: (sep) => {
                return dateInfo.join(sep);
            }
        };
    }
    function makeDayString(day, pattern) {
        const dateInfo = makeDateInfo(String(day.getFullYear()));
        dateInfo.push(day.getMonth() + 1);

        if (pattern === 'YYYY-MM') {
            return dateInfo.join('-');
        } else if (pattern === 'YYYYMMDDhhmmss') {
            dateInfo.push(day.getDate());
            dateInfo.push(day.getHours());
            dateInfo.push(day.getMinutes());
            dateInfo.push(day.getSeconds());
            return dateInfo.join('');
        } else {
            dateInfo.push(day.getDate());
            return dateInfo.join('-');
        }
    }
    function makeFirstDayString(day) {
        // day: string(YYYY-MM(-DD)) or Date Object
        let firstDay;
        if (typeof day === 'string') {
            day = new Date(day);
        }
        firstDay = new Date(day.getFullYear(), day.getMonth(), 1);
        return makeDayString(firstDay);
    }
    function makeLastDayString(day) {
        // day: string(YYYY-MM(-DD)) or Date Object
        let lastDay;
        if (typeof day === 'string') {
            day = new Date(day);
        }
        lastDay = new Date(day.getFullYear(), day.getMonth() + 1, 0);
        return makeDayString(lastDay);
    }

    function makeNowDayString () {
        return makeDayString(new Date());
    }
    return {
        makeDayString,
        makeNowDayString,
        makeFirstDayString,
        makeLastDayString
    };

}());
