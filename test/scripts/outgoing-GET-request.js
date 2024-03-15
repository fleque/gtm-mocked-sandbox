const sendHttpRequest = require('sendHttpRequest');
const setResponseStatus = require('setResponseStatus');
const setResponseBody = require('setResponseBody');
const setResponseHeader = require('setResponseBody');

sendHttpRequest('https://postman-echo.com/get').then((response) => {
    setResponseStatus(response.statusCode);
});