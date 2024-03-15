const GtmSandboxMock = require('../src/gtm-mocked-sandbox');
const getRelativeFile = require('./getRelativeFile')

describe('real outgoing requests', () => {

    it('should be able to send GET requests', function (done) {
        let mock = new GtmSandboxMock();
        spyOn(mock.getSandbox(), 'setResponseStatus');
        mock.requireTestModule(getRelativeFile('./scripts/outgoing-GET-request.js'));
        mock.getIssuedPromises().then(() => {
            expect(mock.getSandbox().setResponseStatus).toHaveBeenCalled();
            done();
        }).catch((err) => {
            done.fail('Failed with error: ' + err);
        })
    });

    it('should be able to send multiple events and wait', function (done) {
        let mock = new GtmSandboxMock();
        spyOn(mock.getSandbox(), 'setResponseStatus');
        spyOn(mock.getSandbox(), 'setResponseBody');
        mock.requireTestModule(getRelativeFile('./scripts/outgoing-multiple-requests.js'));
        mock.getIssuedPromises().then(() => {
            expect(mock.getSandbox().setResponseStatus).toHaveBeenCalledWith(200);
            expect(mock.getSandbox().setResponseBody).toHaveBeenCalledWith('4');
            done();
        }).catch((err) => {
            done.fail('Failed with error: ' + err);
        })
    }, 10000);
});

describe('mocked outgoing requests', () => {
    const getUrl = 'https://postman-echo.com/get';
    const postUrl = 'https://postman-echo.com/post';
    const matchingHeaders = {'Content-Type': 'application/json', Accept: 'application/json'};
    const notMatchingHeaders = {'Content-Type': 'application/json', Accept: 'application/xml'};
    const matchingBody = JSON.stringify({outgoing: 'value'});
    const notMatchingBody = 'some body content';
    const markedResponse = {statusCode: 333};

    function setupRunAndCheckFor(done, method, mockedRequest, findMarked=true) {
        let mock = new GtmSandboxMock();
        const responseBodySpy = spyOn(mock.getSandbox(), 'setResponseBody');
        mock.mockOutgoingHttpRequest(mockedRequest);
        mock.requireTestModule(getRelativeFile('./scripts/outgoing-mocked-requests.js'));
        mock.getIssuedPromises().then(() => {
            expect(mock.getSandbox().setResponseBody).toHaveBeenCalledTimes(1);
            let response = JSON.parse(responseBodySpy.calls.argsFor(0)[0]);
            expect(response[method].statusCode).toBe(findMarked ? 333 : 200);
            done();
        }).catch((err) => {
            done.fail('Failed with error: ' + err);
        })
    }

    it('should be possible to register by url only', function (done) {
        setupRunAndCheckFor(done, 'get',
            {url: getUrl, response: markedResponse}
        );
    }, 10000);

    it('should be possible to register by url and method', function (done) {
        setupRunAndCheckFor(done, 'post',
            {url: postUrl, options: {method: 'POST'}, response: {statusCode: 333}}
        );
    }, 10000);

    it('should be possible to register by url/method and exact header match', function (done) {
        setupRunAndCheckFor(done, 'post',
            {
                url: postUrl,
                options: {
                    method: 'POST',
                    headers: matchingHeaders
                },
                checkOptions: true,
                response: markedResponse
            }
        );
    }, 10000);

    it('should not match if headers do not match', function (done) {
        setupRunAndCheckFor(done, 'post',
            {
                url: 'https://postman-echo.com/post',
                options: {
                    method: 'POST',
                    headers: notMatchingHeaders
                },
                checkOptions: true,
                response: markedResponse
            }, false
        );
    }, 10000);

    it('should match for all equal', function (done) {
        setupRunAndCheckFor(done, 'post',
            {
                url: 'https://postman-echo.com/post',
                options: {
                    method: 'POST',
                    headers: matchingHeaders
                },
                checkOptions: true,
                body: matchingBody,
                checkBody: true,
                response: markedResponse
            }
        );
    }, 10000);

    it('should not match if body does not match', function (done) {
        setupRunAndCheckFor(done, 'post',
            {
                url: 'https://postman-echo.com/post',
                options: {
                    method: 'POST',
                    headers: matchingHeaders
                },
                checkOptions: true,
                body: notMatchingBody,
                checkBody: true,
                response: markedResponse
            }, false
        );
    }, 10000);

});