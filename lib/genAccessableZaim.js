/*eslint-env es6: true, node: true, browser: false */
/*eslint no-console: 1 */
/* genAccessableZaim.js
   written on 2016.3.13

       access可能なzaimオブジェクトをPromiseで返す
       引数
           info: {
               consumerKey:
               consumerSecret:
               accessToken:
               accessTokenSecret:
           }
           newAccessTokenHandler: アクセストークンを再取得した時に呼ばれるハンドラ

       1. getUserを実行しZAIMにアクセステスト
       2. アクセスに失敗したら、getAccessTokenで新規アクセストークを取得
          2-1. 標準出力に出力されたURLにアクセス
          2-2. そのページで、アクセス認証操作。
          2-3. 認証コード（Verifierコード）が表示される
          2-4. 標準入録に認証コード（Verifierコード）を入力
          2-5. newAccessTokenHandler呼び出し。
               この時の引数は以下のオブジェクト
                {
                  newAccessToken:
                  newAccessTokenSecret:
                }
       3. newAccessTokenHandlerの戻り値Promiseを待つ
*/

module.exports = (function () {
    'use strict';
    const
        co = require('co'),
        makeZaim = require('./zaimUtil');

    function tryReject(reject, cb) {
        return  function () {
            try {
                cb.apply(null, arguments);
            } catch (err) {
                reject(err);
            }

        };
    }
    function generateTryBlock(reject) {
        return tryReject.bind(null, reject);
    }

    function readOneline() {
        // 一行入力処理
        const reader = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve, reject) => {
            const tryBlock = generateTryBlock(reject);

            reader.on('line', tryBlock((line) => {
                reader.close();
                resolve(line.trim());
            }));
        });
    }

    function genAccessableZaim(info, newAccessTokenHandler) {
        return co(function *() {
            const zaim = makeZaim({
                consumerKey: info.consumerKey,
                consumerSecret: info.consumerSecret
            });
            let status;

            if (info.accessToken !== undefined && info.accessToken !== undefined) {
                // try access to zaim
                status = yield (
                    zaim.setAccessToken({
                        accessToken: info.accessToken,
                        accessTokenSecret: info.accessTokenSecret
                    })
                    .getUser()
                    .then(() => {return 'Success';})
                    .catch((err) => {
                        if (err.statusCode === 401) {
                            return 'Failure';
                        } else {
                            throw err;
                        }
                    })
                );
            } else {
                status = 'NoSetting';
            }

            // console.log(`status=${status}`);
            if (status === 'Success') {
                return zaim;
            } else {
                let newInfo;

                newInfo = yield zaim.getAccessToken((url) => {
                    process.stdout.write([
                        '以下のURLで認証し、Verifierコードを入手してください。\n',
                        url,
                        '\nInput Verifier:'
                    ].join(''));
                    return readOneline();
                });
                if (newAccessTokenHandler !== undefined) {
                    let prms;
                    prms = newAccessTokenHandler(newInfo);
                    if (prms !== undefined) {
                        yield prms;
                    }
                }
                return zaim.setAccessToken({
                    accessToken: newInfo.accessToken,
                    accessTokenSecret: newInfo.accessTokenSecret
                });
            }
        });
    }

    return genAccessableZaim;
}());
