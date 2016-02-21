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
        wStream._write = function (chunk, encoding, callback) {
            console.log('*chunk* ---');
            chunk.forEach( (obj) => {
                console.dir(obj);
            });
            console.log('---- ---');
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
    function sourceStream(source) {
        const
            rStream = new stream.Readable();
        let    firstFlag = true;
        rStream._read = function () {
            if (firstFlag) {
                rStream.push(source);
                firstFlag = false;
            } else {
                rStream.push(null);
            }
        };
        return rStream;
    }


    console.log('timer test');
    timer(1).then(() => {
        const
            sourceObjects = new stream.Readable({objectMode: true}),
            sources = [[{n:1},{n:2}], [{n:3},{n:4},{n:5}],[{n:6}]];
        sourceObjects._read = function () {
            sourceObjects.push(sources.shift()||null);
        };
        const wStream = genWStream();
        sourceObjects.pipe(wStream);
        return finishPromise(wStream);
    }).then(() => {
        const
            sourceStrm = sourceStream('{"a":["1", "2"]}'),
            jsonStrm = require('JSONStream').parse('a'),
            wStream = genWStream();

        sourceStrm.pipe(jsonStrm).pipe(wStream);
        return finishPromise(wStream);
    }).then(() => {
        console.log('test End');
    }).catch((err) => {
        console.log(err.stack);
    });

})();
