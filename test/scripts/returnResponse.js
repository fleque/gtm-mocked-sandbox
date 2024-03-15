const returnResponse = require('returnResponse');
const setResponseStatus = require('setResponseStatus');
const setResponseBody = require('setResponseBody');
const setResponseHeader = require('setResponseHeader');
const setCookie = require('setCookie');
const JSON = require('JSON');

setResponseBody(JSON.stringify({foo: 'test object', bar: 'set as response'}));
setResponseHeader('Conent-Type', 'applicatoin/json');
setResponseStatus(200);
setCookie('idCookie', 'someHash', {domain: 'example.com'});

returnResponse();

// Should not be processed any more
setCookie('errCookie', 'someValue', {domain: 'example.com'});
setResponseHeader('Conent-Type', 'text/html');
setResponseBody('<html><body>This is an error</body></html>')
setResponseStatus(400);
