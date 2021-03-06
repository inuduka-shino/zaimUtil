/*jslint node: true, indent: 4  */
/*global Promise */
/*eslint no-console: 1 */

/* fsUtil.js
   fs for Promise
   written on 2016.1.11
*/

module.exports = (function () {
    'use strict';
    const
        fs = require('fs'),
        co = require('co');

    function stat(filepath) {
        return new Promise((resolve, reject) => {
            fs.stat(filepath, (err, stat) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stat);
                }
            });
        });
    }
    function readdir(folderPath) {
        return new Promise((resolve, reject) => {
            fs.readdir(folderPath, (err, files) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(files);
                }
            });
        });
    }
    function rename(srcPath, dstPath) {
        return new Promise((resolve, reject) => {
            fs.rename(srcPath, dstPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
    function readFile(srcPath) {
        return new Promise((resolve, reject) => {
            fs.readFile(srcPath, (err, buff) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(buff);
                }
            });
        });
    }
    function writeFile(dstPath, buff, opt) {
        return new Promise((resolve, reject) => {
            fs.writeFile(dstPath, buff, opt, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    function countableFilename(path) {
        const
            pathParts = (() => {
                const parts = /(.*)\.([^\.]*)/.exec(path);
                if (parts === null) {
                    return [path, '-', null, ''];
                }
                return [parts[1], '-', null, '.',  parts[2]];
            })();
        return  (i) => {
            pathParts[2] = i;
            return pathParts.join('');
        };
    }

    function createWriteStreamFromNewFile(dstPath, maxLoopNum) {
        const filename = countableFilename(dstPath);
        let stream;

        if (maxLoopNum === undefined) {
            maxLoopNum = 1000;
        }
        return co(function* () {
            for (let i = 0; i < maxLoopNum; i += 1) {
                stream = yield new Promise((resolve, reject) => {
                    const strm = fs.createWriteStream(filename(i), {
                        flags: 'wx'
                    })
                    .on('open', () => {
                        resolve(strm);
                    })
                    .on('error', (err) => {
                        if (err.code === 'EEXIST') {
                            resolve('EEXIST');
                        } else {
                            reject(err);
                        }
                    });
                });
                if (stream === 'EEXIST') {
                    continue;
                } else {
                    return stream;
                }
            }
            throw new Error(`can not generate file:${dstPath}`);
        });
    }

    function writeOnlyFile(dstPath, buff, maxLoopNum) {
        const filename = countableFilename(dstPath);

        if (maxLoopNum === undefined) {
            maxLoopNum = 1000;
        }

        return co(function *() {
            let stat,
                fn;
            for(let i = 0; i < maxLoopNum; i += 1) {
                stat = yield writeFile(fn = filename(i), buff, {
                    flag: 'wx'
                }).catch((err) => {
                    if (err.code === 'EEXIST') {
                        return 'EEXIST';
                    }
                    throw err;
                });
                if (stat !== 'EEXIST') {
                    return fn;
                }
            }
            throw new Error(`can not generate file:${dstPath}`);
        });
    }

    function remove(filePath) {
        return new Promise((resolve, reject) => {
            fs.unlink(filePath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    function trans(srcPath, dstPath, transFunc) {
        if (transFunc === undefined) {
            transFunc = function (buffer) {
                return Promise.resolve(buffer);
            };
        }
        return Promise.all([
            new Promise((resolve, reject) => {
                const stream = fs.createReadStream(srcPath);
                stream
                    .on('open', () => {
                        resolve(stream);
                    })
                    .on('error', (err) => {
                        reject(err);
                    });
            }),
            new Promise((resolve, reject) => {
                const stream = fs.createWriteStream(dstPath, {flags: 'wx'});
                //"wx"はファイルが存在するとエラー
                stream
                    .on('open', () => {
                        resolve(stream);
                    })
                    .on('error', (err) => {
                        reject(err);
                    });
            })
        ]).then((streams) => {
            const srcStream = streams[0],
                dstStream = streams[1];

            return new Promise((resolve) => {
                //var buffer = new Buffer();
                const chunks = [];
                srcStream
                    .on('data', (chunk) => {
                        //buffer.concat([chunk]);
                        chunks.push(chunk);
                    })
                    .on('close', () => {
                        resolve(Buffer.concat(chunks));
                    });
            }).then((buffer) => {
                return transFunc(buffer);
            }).then((buffer) => {
                dstStream.write(buffer);
                dstStream.end();
            });
        });
    }
    function copy(srcPath, dstPath) {
        return Promise.all([
            new Promise((resolve, reject) => {
                const stream = fs.createReadStream(srcPath);
                stream
                    .on('open', () => {
                        resolve(stream);
                    })
                    .on('error', (err) => {
                        reject(err);
                    });
            }),
            new Promise((resolve, reject) => {
                const stream = fs.createWriteStream(dstPath, {flags: 'wx'});
                //"wx"はファイルが存在するとエラー
                stream
                    .on('open', () => {
                        resolve(stream);
                    })
                    .on('error', (err) => {
                        reject(err);
                    });
            })
        ]).then((streams) => {
            const srcStream = streams[0],
                dstStream = streams[1];

            return new Promise((resolve) => {
                srcStream
                    .on('data', (chunk) => {
                        dstStream.write(chunk);
                    })
                    .on('close', () => {
                        dstStream.end();
                        resolve();
                    });
            });
        });
    }


    return {
        stat: stat,
        readdir: readdir,
        rename: rename,
        readFile: readFile,
        writeFile: writeFile,
        writeOnlyFile: writeOnlyFile,
        createWriteStreamFromNewFile: createWriteStreamFromNewFile,
        remove: remove,
        copy: copy,
        trans: trans
    };

}());
