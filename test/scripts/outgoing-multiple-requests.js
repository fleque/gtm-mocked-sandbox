const sendHttpGet = require('sendHttpGet');
const sendHttpRequest = require('sendHttpRequest');
const setResponseStatus = require('setResponseStatus');
const setResponseBody = require('setResponseBody');
const setResponseHeader = require('setResponseBody');
const makeString = require('makeString');
const JSON = require('JSON');

const Promise = require('Promise');


const scriptPromises = [];
let resultCodes = [];

for (let i = 0; i < 3; i++) {
    scriptPromises.push(
        sendHttpGet('https://postman-echo.com/get').then((response) => {
            resultCodes.push(response.statusCode);
        })
    );
}

scriptPromises.push(
    sendHttpRequest('https://postman-echo.com/post', {method: 'POST'}, JSON.stringify({testObject: 'property'})).then((response) =>  {
        resultCodes.push(response.statusCode);
    })
);

Promise.all(scriptPromises).then(() => {
    let responseStatus = 200;
    resultCodes.forEach(item => {
        if (item != 200) {
            responseStatus = item;
        }
    });
    setResponseStatus(responseStatus);
    setResponseBody(makeString(resultCodes.length));
});


