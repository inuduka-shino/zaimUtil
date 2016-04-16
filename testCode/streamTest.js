/*eslint no-console: 0 */

(() => {
    'use strict';
    const stream = require('stream');

    function timer(waitTime) {
        return new Promise((resolve) => {
            setTimeout(resolve,waitTime);
        });
    }

    function genWStream(mode) {
        const wStream = new stream.Writable({
            objectMode: true
        });
        wStream._write = function (obj, encoding, callback) {
            if (mode === 'dir') {
                console.dir(obj);
            } else {
                console.log('>> ' + obj);
            }
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
    timer(1).then(() => {
        //console.log('delay output');
        throw new Error('jump');
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
    }).catch((err) => {
        if (err.message === 'jump') {
            console.log('from ' + err.message);
        } else {
            throw err;
        }
    }).then(() => {
        console.log('concat stream');
        const wStream = genWStream();
        const source = ['1', '2', '3'];
        const source2 = ['A', 'B', 'C'];
        const rStream = new stream.Readable({
            objectMode: true
        });
        const rStream2 = new stream.Readable({
            objectMode: true
        });
        rStream._read = function () {
            rStream.push(source.shift()||null);
        };
        rStream2._read = function () {
            rStream2.push(source2.shift()||null);
        };
        const tStream = new stream.Transform({
            objectMode: true
        });
        tStream._transform = function (chunk, encode, cb) {
            tStream.push(chunk);
            cb();
        };
        tStream._flush = function (cb) {
            cb();
        };

        tStream.pipe(wStream);

        rStream.pipe(tStream,  { end: false });
        rStream2.pipe(tStream,  { end: false });

        rStream2.on('end', () => {
            tStream.end('END');
        });

        return finishPromise(wStream);

    }).then(() => {
        console.log('translate stream');
        const wStream = genWStream();
        const rStream = new stream.Readable({
            objectMode: true
        });
        const source = ['1', '2', '3', 'AAA'];
        rStream._read = function () {
            rStream.push(source.shift()||null);
        };

        function counterStream () {
            const
                tStream = new stream.Transform({
                    objectMode: true
                }),
                cntPrms = new Promise((resolve) => {
                    let count = 0;
                    tStream._transform = function (chunk, encoding, callback) {
                        //console.dir(chunk);
                        //console.log(`encoding= ${encoding}`);
                        tStream.push(chunk);
                        count += 1;
                        callback();
                    };
                    tStream._flush = function (cb) {
                        resolve(count);
                        cb();
                    };
                });
            return {
                stream: tStream,
                promise: cntPrms
            };
        }

        const counter = counterStream();
        counter.promise.then((cnt) => {
            console.log(`count = ${cnt}`);
        });
        rStream.pipe(counter.stream).pipe(wStream);

        return finishPromise(wStream);
    }).then(() => {
        console.log('delay readable stream');
        const source = ['A', {b:'obejct-b'}, 'CcC'];
        const wStream = genWStream('dir');
        const rStream = new stream.Readable({
            objectMode: true
        });
        rStream._read = function () {
            timer(50).then(()=>{
                rStream.push(source.shift()||null);
            });
        };

        rStream.pipe(wStream);

        return finishPromise(wStream);

    }).then(() => {
        console.log('concat stream2(merge)');
        const wStream = genWStream();
        const source = ['11', '22', '33'];
        const source2 = ['A', '22', 'B', 'C'];
        const pass = new Set();
        const rStream = new stream.Readable({
            objectMode: true
        });
        const rStream2 = new stream.Readable({
            objectMode: true
        });
        rStream._read = function () {
            rStream.push(source.shift()||null);
        };
        rStream2._read = function () {
            let chunk;
            do {
                chunk = source2.shift();
            } while(pass.has(chunk) && (chunk !== undefined));
            rStream2.push(chunk||null);
        };

        const tStream = new stream.Transform({
            objectMode: true
        });
        tStream._transform = function (chunk, encode, cb) {
            tStream.push(chunk);
            cb();
        };
        tStream._flush = function (cb) {
            cb();
        };

        tStream.pipe(wStream);

        rStream.on('data', (chunk) => {
            pass.add(chunk);

        });
        rStream.pipe(tStream,  { end: false });
        rStream.on('end', () => {
            rStream2.pipe(tStream,  { end: false });
        });

        rStream2.on('end', () => {
            tStream.end('END');
        });

        return finishPromise(wStream);

    }).then(() => {
        console.log('test End');
    }).catch((err) => {
        console.log('*** ERROR ***');
        console.log(err.stack);
    });

})();
