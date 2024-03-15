const GtmSandboxMock = require('../src/gtm-mocked-sandbox');

describe('computeEffectiveTldPlusOne', () => {

    let sandbox;

    beforeEach(() => {
        sandbox = new GtmSandboxMock().getSandbox();
    });

    it('should handle co.uk', function () {
        expect(sandbox.computeEffectiveTldPlusOne('www.example.co.uk')).toBe('example.co.uk');
    });

    it('should handle regular domains', function () {
        expect(sandbox.computeEffectiveTldPlusOne('www.mysservice.example.io')).toBe('example.io');
        expect(sandbox.computeEffectiveTldPlusOne('www.mysservice.example.com')).toBe('example.com');
    });

    it('should handle urls', function () {
        expect(sandbox.computeEffectiveTldPlusOne('http://www.mysservice.example.org')).toBe('example.org');
        expect(sandbox.computeEffectiveTldPlusOne('https://www.mysservice.example.gov')).toBe('example.gov');
        expect(sandbox.computeEffectiveTldPlusOne('https://www.mysservice.example.co.uk/some/path/on/server?and=someparam')).toBe('example.co.uk');
    });
});



describe('decodeUriComponent', () => {
    const specialCharsEncoded = '%21%40%23%24%25%5E%26%2A%28%29';
    const specialCharsDecoded = '!@#$%^&*()';

    it('should decode spaces and special characters', () => {
        let sandbox = new GtmSandboxMock().getSandbox();
        expect(sandbox.decodeUriComponent('hello%20world')).toBe('hello world');
        expect(sandbox.decodeUriComponent(specialCharsEncoded)).toBe(specialCharsDecoded);
    });
});



describe('encodeUri and decodeUri', () => {
    const uriWithSpecialChars = "https://example.com/:path?query=value#fragment&param=1&param=2";
    const encodedUriWithSpecialChars = encodeURI(uriWithSpecialChars);
    const uriWithNonAsciiChars = "https://example.com/éöäü";
    const encodedUriWithNonAsciiChars = encodeURI(uriWithNonAsciiChars);

    it('should not encode/decode special characters important to uri structure', () => {
        let sandbox = new GtmSandboxMock().getSandbox();
        expect(sandbox.encodeUri(uriWithSpecialChars)).toBe(encodedUriWithSpecialChars);
        expect(sandbox.decodeUri(encodedUriWithSpecialChars)).toBe(uriWithSpecialChars);
    });

    it('should encode/decode non-ASCII special characters', () => {
        let sandbox = new GtmSandboxMock().getSandbox();
        expect(sandbox.encodeUri(uriWithNonAsciiChars)).toBe(encodedUriWithNonAsciiChars);
        expect(sandbox.decodeUri(encodedUriWithNonAsciiChars)).toBe(uriWithNonAsciiChars);
    });
});


describe('parseUrl', () => {

    let sandbox;

    beforeEach(() => {
        sandbox = new GtmSandboxMock().getSandbox();
    });

    it('supports example from goole doc', () => {
        let parsedUrl = sandbox.parseUrl('https://abc:xyz@example.com:8080/foo?param=val%2Cue#bar');
        expect(parsedUrl.protocol).toBe('https:');
        expect(parsedUrl.username).toBe('abc');
        expect(parsedUrl.password).toBe('xyz');
        expect(parsedUrl.host).toBe('example.com:8080');
        expect(parsedUrl.hostname).toBe('example.com');
        expect(parsedUrl.port).toBe('8080');
        expect(parsedUrl.pathname).toBe('/foo');
        expect(parsedUrl.search).toBe('?param=val%2Cue');
        expect(parsedUrl.searchParams).toBeDefined();
        expect(parsedUrl.searchParams['param']).toBe('val,ue');
        expect(parsedUrl.hash).toBe('#bar');
    });

    it('returns undefined for invalid Url', () => {
        expect(sandbox.parseUrl('http abc @ example.com')).toBeUndefined();
    });
});


describe('logToConsole', () => {

    let mock;

    beforeEach(() => {
        mock = new GtmSandboxMock();
    });

    it('can be called with one argument', () => {
        expect(mock.getSandbox().logToConsole('one argument'))
    });

    it('can be called with multiple arguments', () => {
        spyOn(mock.getSandbox(), 'logToConsole');
        mock.getSandbox().logToConsole('call: ', 1, {test: "test"}, ' with multiple arguments');
        expect(mock.getSandbox().logToConsole).toHaveBeenCalledWith(jasmine.any(String), jasmine.any(Number), jasmine.any(Object), jasmine.any(String));
    });
});

describe('make type methods', () => {

    let sandbox;

    beforeEach(() => {
        sandbox = new GtmSandboxMock().getSandbox();
    });

    it('should make Numbers', () => {
        expect(typeof sandbox.makeNumber('42')).toBe('number');
        expect(sandbox.makeNumber('42')).toBe(42);
        expect(typeof sandbox.makeNumber('42.2')).toBe('number');
        expect(sandbox.makeNumber('42.2')).toBe(42.2);
        expect(typeof sandbox.makeNumber('42,2')).toBe('number');
        expect(sandbox.makeNumber('42,2')).toBeNaN();
    });

    it('should make Integers', () => {
        expect(typeof sandbox.makeInteger('42')).toBe('number');
        expect(sandbox.makeInteger('42')).toBe(42);
        expect(typeof sandbox.makeInteger('42.2')).toBe('number');
        expect(sandbox.makeInteger('42.2')).toBe(42);
        expect(typeof sandbox.makeInteger('x4-2,2')).toBe('number');
        expect(sandbox.makeInteger('x4-2,2')).toBeNaN();
    });

    it('should make Strings', () => {
        expect(typeof sandbox.makeString(42)).toBe('string');
        expect(sandbox.makeString(42)).toBe('42');
        expect(typeof sandbox.makeString({value: 42})).toBe('string');
        expect(typeof sandbox.makeString([21.1, 42,2])).toBe('string');
    });

    it('makeTableMap complies to goolge doc example', () => {
        // Example usage:
        const tableObj = [
            {'key': 'k1', 'value': 'v1'},
            {'key': 'k2', 'value': 'v2'}
        ];
        const tableMap = sandbox.makeTableMap(tableObj, 'key', 'value');
        expect(tableMap.k1).toBeDefined();
        expect(tableMap.k1).toBe('v1');
        expect(tableMap.k2).toBeDefined();
        expect(tableMap.k2).toBe('v2');
    });

    it('makeTableMap works also with other attributes', () => {
        // Example usage:
        const tableObj = [
            {'name': 'k1', 'id': 'v1', 'more': 'someMore'},
            {'name': 'k2', 'id': 'v2', 'evenMore': 'foobar'}
        ];
        const tableMap = sandbox.makeTableMap(tableObj, 'id', 'name');
        expect(tableMap.v1).toBeDefined();
        expect(tableMap.v1).toBe('k1');
        expect(tableMap.v2).toBeDefined();
        expect(tableMap.v2).toBe('k2');
    });

});

describe('sha256', () => {

    let sandbox;

    beforeEach(() => {
        sandbox = new GtmSandboxMock().getSandbox();
    });

    it('sync and async create the same', (done) => {
        let syncResult = sandbox.sha256Sync('testString');
        sandbox.sha256('testString', (digest) => {
            expect(digest).toBe(syncResult);
            done();
        })
    });
});
