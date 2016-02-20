/*eslint no-console: 0 */

(() => {
    'use strict';
    const stream = require('stream');

    function timer(waitTime) {
        return new Promise((resolve) => {
            setTimeout(resolve,waitTime);
        });
    }

    function genWStream() {
        const wStream = new stream.Writable({
            objectMode: true
        });
        wStream._write = function (obj, encoding, callback) {
            console.log('>> ' + obj);
            callback();
        };
        return wStream;
    }
    function finishPromise(wstream) {
        return new Promise((resolve) => {
            wstream.on('finish', () => {
                resolve();
            });
        });
    }

    console.log('timer test');
    timer(1000).then(() => {
        console.log('delay output');
    }).then(() => {
        console.log('nomal readable stream');
        const source = ['A', 'BB', 'CcC'];
        const wStream = genWStream();
        const rStream = new stream.Readable({
            objectMode: true
        });
        rStream._read = function () {
            rStream.push(source.shift()||null);
        };

        rStream.pipe(wStream);

        return finishPromise(wStream);

    }).then(() => {
        console.log('delay readable stream');
        const source = ['X', 'YY', 'ZZZ'];
        const wStream = genWStream();
        const rStream = new stream.Readable({
            objectMode: true
        });
        rStream._read = function () {
            timer(500).then(() => {
                rStream.push(source.shift()||null);
            });
        };
        rStream.pipe(wStream);
        return finishPromise(wStream);
    }).then(() => {
        console.log('double push readable stream');
        const source = ['X', 'YY', 'ZZZ'];
        const wStream = genWStream();
        const rStream = new stream.Readable({
            objectMode: true
        });
        rStream._read = function () {
            console.log('*read');
            timer(500).then(() => {
                const x = source.shift()||null;
                if (x !== null) {
                    console.log('*push ' + rStream.push(x));
                    console.log('***push ' + rStream.push('-' + x));
                } else {
                    console.log('no data: null push ' + rStream.push(null));
                }
            });
        };
        rStream.pipe(wStream);
        return finishPromise(wStream);
    });


})();
