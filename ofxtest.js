/*eslint no-console: 0 */

(function () {
    'use strict';
    const // config = require('./config'),
        ofx = require('node-ofx'),
        fs = require('fs'),
        ofxInfo = require('./ofxInfo/info'),

        header = ofxInfo.header,
        body = ofxInfo.body;

    console.log('writeing...');
    fs.writeFile(
        'work/sampleOutput.ofx',
        ofx.serialize(header, body),
        {
            encoding: 'utf8'
        },
        () => {
            console.log('wrote!');
        }
    );

}());
