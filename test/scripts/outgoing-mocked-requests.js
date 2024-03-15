const sendHttpGet = require('sendHttpGet');
const sendHttpRequest = require('sendHttpRequest');
const setResponseStatus = require('setResponseStatus');
const setResponseBody = require('setResponseBody');
const JSON = require('JSON');

const Promise = require('Promise');


const scriptPromises = [];
let resultBody = {};

scriptPromises.push(
    sendHttpGet('https://postman-echo.com/get').then((response) => {
        resultBody.get = response
    })
);

scriptPromises.push(
    sendHttpRequest(
        'https://postman-echo.com/post',
        {
            method: 'POST',
            headers: {Accept: 'application/json', 'Content-Type': 'application/json'}
        },
        JSON.stringify({outgoing: 'value'})
    ).then((response) => {
        resultBody.post = response
    })
);

Promise.all(scriptPromises).then(() => {
    setResponseStatus(200);
    setResponseBody(JSON.stringify(resultBody));
});


