const GtmSandboxMock = require('../src/gtm-mocked-sandbox');
const getRelativeFile = require('./getRelativeFile')
const fs = require('fs');

describe('mock incoming request', () => {
    let mock;

    beforeEach(() => {
        mock = new GtmSandboxMock();
        mock.mockIncomingRequest(fs.readFileSync(getRelativeFile('./requests/req1.http'), 'utf-8'));
    });

    it('should parse first line (method, path, httpVersoin) ', () => {
        expect(mock.getSandbox().getRequestMethod()).toBe('POST');
        expect(mock.getSandbox().getRequestPath()).toBe('/data/resource');
    });

    it('should parse headers individually', () => {
        expect(mock.getSandbox().getRequestHeader('HOST')).toBe('my.host.com');
        expect(mock.getSandbox().getRequestHeader('content-type')).toBe('application/json');
        expect(mock.getSandbox().getRequestHeader('X-Correlation-ID')).not.toBeNull();
    });

    it('should parse duplicate headers into comma-separated list', () => {
        expect(mock.getSandbox().getRequestHeader('accept')).toBe('text/plain, text/html');
    });

    it('should parse query string', () => {
        expect(mock.getSandbox().getRequestQueryString()).not.toBeNull();
        expect(mock.getSandbox().getRequestQueryString()).toBeDefined();
        expect(mock.getSandbox().getRequestQueryString()).toBe('v=2&param_name=with%20space&2nd%20param=simpleValue');
        mock.mockIncomingRequest(fs.readFileSync(getRelativeFile('./requests/req2.http'), 'utf-8'));
        expect(mock.getSandbox().getRequestQueryString()).toBe('');
    });

    it('should parse and decode query params', () => {
        expect(mock.getSandbox().getRequestQueryParameter('param_name')).toBe('with space');
        expect(mock.getSandbox().getRequestQueryParameter('2nd param')).toBe('simpleValue');
        const queryParams = mock.getSandbox().getRequestQueryParameters();
        expect(queryParams).not.toBeNull();
        expect(queryParams).toBeDefined();
        expect(queryParams.param_name).toBe('with space');
        expect(queryParams['2nd param']).toBe('simpleValue');
    });

    it('should parse single cookie values into array', () => {
        var cookieValues = mock.getSandbox().getCookieValues('tracking_user_id')
        expect(cookieValues).toBeInstanceOf(Array);
        expect(cookieValues.length).toBe(1);
        expect(cookieValues[0]).toBe('s-123-456');
    });

    it('should parse multiple cookie values into array', () => {
        var cookieValues = mock.getSandbox().getCookieValues('_id')
        expect(cookieValues).toBeInstanceOf(Array);
        expect(cookieValues.length).toBe(3);
        expect(cookieValues[0]).toBe('id.1.1');
        expect(cookieValues[1]).toBe('id.1.2');
        expect(cookieValues[2]).toBe('id.1.3');
    });

    it('should provide cookies encoded and unencoded', () => {
        var cookieValues = mock.getSandbox().getCookieValues('encodedCookie')
        expect(cookieValues).toBeInstanceOf(Array);
        expect(cookieValues.length).toBe(1);
        expect(cookieValues[0]).toBe('some encoded;value');

        cookieValues = mock.getSandbox().getCookieValues('encodedCookie', false)
        expect(cookieValues).toBeInstanceOf(Array);
        expect(cookieValues.length).toBe(1);
        expect(cookieValues[0]).toBe('some%20encoded%3Bvalue');
    });

    it('should be able to mock cookies only without request parsing', () => {
        let newmock = new GtmSandboxMock();
        newmock.setCookieValuesFromRequestHeader('_id=id.1; test_cookie=testValue; _id=id.2');
        var cookieValues = newmock.getSandbox().getCookieValues('_id');
        expect(cookieValues).toBeInstanceOf(Array);
        expect(cookieValues.length).toBe(2);
        expect(cookieValues[0]).toBe('id.1');
        expect(cookieValues[1]).toBe('id.2');
        cookieValues = newmock.getSandbox().getCookieValues('test_cookie');
        expect(cookieValues).toBeInstanceOf(Array);
        expect(cookieValues.length).toBe(1);
        expect(cookieValues[0]).toBe('testValue');
    })

    it('should return request body if defined', () => {
        expect(mock.getSandbox().getRequestBody()).toBeDefined();
        expect(mock.getSandbox().getRequestBody()).not.toBeNull();
        const jsonObject = JSON.parse(mock.getSandbox().getRequestBody());
        expect(jsonObject.name).toBeDefined();
        expect(jsonObject.name).toBe('John Doe');
    })

    it('should read forwarded into remoteAddress', () => {
        mock.mockIncomingRequest(fs.readFileSync(getRelativeFile('./requests/req2.http'), 'utf-8'));
        expect(mock.getSandbox().getRemoteAddress()).toBe('192.168.10.2');
    });

    it('can mock remoteAddress individually', () => {
        mock.mockIncomingRequest(fs.readFileSync(getRelativeFile('./requests/req2.http'), 'utf-8'));
        mock.setRemoteAddress('127.0.0.1');
        expect(mock.getSandbox().getRemoteAddress()).toBe('127.0.0.1');
    });

});
