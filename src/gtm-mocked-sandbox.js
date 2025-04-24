const proxyquire = require('proxyquire');
const tldts = require('tldts');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');


class GtmSandboxMock {

    constructor() {
        this.fieldData = {
            gtmOnSuccess: function () {},
            gtmOnFailure: function () {}
        };
        this.eventData = {};
        this.reqCookieValues = {};
        this.Math = Math;
        this.JSON = JSON;
        this.Object = {
            delete: function (objectInput, keyToDelete) {
                delete objectInput[keyToDelete];
            },
            keys: function (objectInput) {
                return Object.keys(objectInput);
            },
            values: function (objectInput) {
                return Object.values(objectInput);
            },
            entries: function (objectInput) {
                return Object.entries(objectInput)
            },
            freeze: function (objectInput) {
                return Object.freeze(objectInput);
            }
        };
        this.respCookieValues = {};
        this.containerVersion = {
            containerId: 'GTM-AB12CDEF',
            debugMode: false,
            environmentName: 'env-0',
            environmentMode: true,
            previewMode: false,
            version: '1',
        };
        this.request = {};
        this.response = {
            statusCode: 200,
            body: '',
            headers: {},
            cookies: {}
        };
        this.returnedResponse = null;
        this.claimRequestCalled = false;
        this.issuedPromises = [];
        this.issuedOutgoingRequests = [];
        this.mockedOutgoingRequests = [];
        this.type = 'Tag';
        this.calledApis = new Set();
        this.sandbox = new Sandbox(this);
    }

    /**
     * Returns the response object from the time returnResponse was called.
     */
    getReturnedResponse() {
        return this.returnedResponse;
    }

    setRemoteAddress(remoteAddress) {
        if (!this.request) {
            this.request = {};
        }
        this.request.remoteAddress = remoteAddress;
    }

    mockIncomingRequest(requestData) {
        const lines = requestData.split(/\r?\n/); // Split on newlines (including CR+LF)

        // Request line parsing
        const requestLine = lines.shift(); // First line is the request line
        if (!requestLine) {
            throw new Error('Invalid request format: Missing request line');
        }

        const [method, url, httpVersion] = requestLine.split(/\s+/);
        const {path, queryString, queryParameters} = this._parseUrlFromHttpRequestFormat(url);

        // Header parsing
        const headers = {};
        var cookies = {};
        var remoteAddress = '';
        let line;
        while ((line = lines.shift()) !== undefined) { // Loop until line becomes undefined (empty array)
            const trimmedLine = line.trim(); // Trim leading/trailing whitespace

            if (!trimmedLine) break; // Empty line marks the start of the body

            if (trimmedLine.startsWith('#')) { // We support comments
                continue;
            }

            let [key, value] = trimmedLine.split(':', 2); // Split on colon followed by optional space, limit to 2 parts
            if (!key || !value) {
                continue;
            }
            value = value.trim();
            key = key.trim().toLowerCase();
            if (headers.hasOwnProperty(key)) {
                headers[key] += ', ' + value.trim();
            } else {
                headers[key] = value.trim();
            }

            if (key === 'cookie') {
                if (value) {
                    cookies = this._parseCookiesFromHeader(value);
                }
            }
            if (key === 'forwarded' || key === 'x-forwarded-for') {
                if (value) {
                    if (remoteAddress) {
                        remoteAddress += ', ' + value;
                    } else {
                        remoteAddress = value;
                    }
                }
            }

        }

        // Body parsing (optional)
        const body = lines.length > 0 ? lines.join('\n') : null; // Body might be multi-line

        this.request = {
            method,
            url,
            path,
            queryString,
            queryParameters,
            httpVersion,
            headers,
            cookies,
            body,
            remoteAddress
        };
    }

    /**
     * Parses the cookie values from a request header string and makes them available to getCookieValues.
     *
     * @param cookieHeader The request Cookie header
     */
    setCookieValuesFromRequestHeader(cookieHeader) {
        if (!this.request) {
            this.request = {};
        }
        this.request.cookies = this._parseCookiesFromHeader(cookieHeader);
    }

    _parseCookiesFromHeader(cookieHeader) {
        let cookies = {};
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            const cookieName = decodeURIComponent(parts.shift().trim());
            const cookieValue = parts.join('=');
            if (!cookies.hasOwnProperty(cookieName)) {
                cookies[cookieName] = [];
            }
            cookies[cookieName].push(cookieValue);
        });
        return cookies;
    }


    _parseUrlFromHttpRequestFormat(url) {
        const urlObject = new URL('http://localhost' + url);
        const path = urlObject.pathname;
        const queryString = urlObject.search ? urlObject.search.substring(1): '';
        const queryParameters = Object.fromEntries(urlObject.searchParams);
        return { path, queryString, queryParameters };
    }

    /**
     * Set (some) of the containerVersion properties to overwrite.
     */
    setContainerVersion(containerVersion) {
        this.containerVersion = {...this.containerVersion, ...containerVersion};
    }

    /**
     * Returns all outgoing requests that have been issued during a run of a script with this mocked mock.
     */
    getIssuedOutgoingRequests() {
        return this.issuedOutgoingRequests;
    }

    /**
     * Registers the response of a request. If this request is beeing issued by calling sendHttpRequest, it will not
     * be actually performed but the response given here will be returned.
     */
    mockOutgoingHttpRequest({url, options= {}, body='', response={}, checkOptions=false, checkBody=false}) {
        if (!response) {
            response = {}
        }
        if (!response.statusCode) response.statusCode = 200;
        if (!response.body) response.body = '';
        if (!response.headers) response.headers = {};
        if (!options) options = {};
        if (!options.method) options.method = 'GET';
        this.mockedOutgoingRequests.push({request: {url, options, body}, response, checkOptions, checkBody});
    }

    _findMockedRequest(url, options, body) {
        if (!options) options = {};
        if (!options.method) options.method = 'GET';
        let reqObj = {url, options, body};
        for (let i = 0; i < this.mockedOutgoingRequests.length; i++) {
            let mockedReq = this.mockedOutgoingRequests[i];
            if (reqObj.url === mockedReq.request.url && reqObj.options.method === mockedReq.request.options.method) {
                if (mockedReq.checkOptions) {
                    if (!this._deepEquals(mockedReq.request.options, reqObj.options)) {
                        continue;
                    }
                }
                if (mockedReq.checkBody) {
                    if (mockedReq.request.body !== reqObj.body) {
                        continue;
                    }
                }
                return mockedReq;
            }
        }
        return null;
    }

    apiCalled(apiName) {
        this.calledApis.add(apiName);
    }

    assertApi(apiName) {
        let self = this;
        return {
            wasCalled: function() {
                if (!self.calledApis.contains(apiName)) {
                    throw new Error(`${apiName} was not called.`);
                }
            },
            wasNotCalled: function() {
                if (self.calledApis.contains(apiName)) {
                    throw new Error(`${apiName} was called, but should not have been.`);
                }
            }
        }
    }

    _deepEquals(obj1, obj2) {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        if (keys1.length !== keys2.length) {
            return false;
        }
        for (let key of keys1) {
            if (!obj2.hasOwnProperty(key)) {
                return false;
            }
            if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
                if (!this._deepEquals(obj1[key], obj2[key])) {
                    return false;
                }
            } else if (obj1[key] !== obj2[key]) {
                return false;
            }
        }
        return true;
    }

    async _httpRequestProxyPromise(requestPromise, resolve) {
        let response = await requestPromise;
        return resolve(response);
    }

    /**
     * Sets the event data that should be available for the test script to run using getAllEventData() and getEventData(keyPath)
     *
     * @param mockedData The data to make available.
     */
    setEventData(mockedData) {
        this.eventData = mockedData;
    }

    /**
     * Set the field data that will be available to a script as 'data' variable.
     */
    setTemplateFieldData(fieldData) {
        this.fieldData = Object.assign({}, fieldData);
        this.fieldData.gtmOnSuccess = function() {};
        this.fieldData.gtmOnFailure = function() {};
    }

    /**
     * @Deprecated: This only exists because of a former typo.
     */
    setTempalteFieldData(fieldData) {
        this.setTemplateFieldData(fieldData);
    }

    /**
     * Add a property to the field data that will be available to a script as 'data' variable.
     */
    addTemplateFieldData(propertyName, propertyValue) {
        this.fieldData[propertyName] = propertyValue;
    }

    /**
     * Returns the current set template field data.
     */
    getTemplateFieldData() {
        return this.fieldData;
    }

    setScriptType(type) {
        this.type = type;
    }

    _getMockedMethodMap() {
        const methodNames = Reflect.ownKeys(Reflect.getPrototypeOf(this.sandbox)).filter(prop =>
            typeof this.sandbox[prop] === "function" &&
            !prop.startsWith('constructor') &&
            !prop.startsWith('_') &&
            !prop.startsWith('mock')
        );
        return methodNames.reduce((methods, methodName) => {
            methods[methodName] = this.sandbox[methodName].bind(this.sandbox);
            return methods;
        }, {})
    }

    _getSpecFileInfo(fullPath) {
        const parts = fullPath.split('/');
        const testFolderIndex = parts.indexOf('test');
        let filename = parts.pop().replace('.spec', '');
        let path;
        if (testFolderIndex !== -1) {
            parts[testFolderIndex] = 'src';
            path = `/${parts.join('/')}`;
        } else {
            path = '';
        }
        return { filename, path };
    }

    /**
     * Runs the module that corresponds to the given spec file.
     * It will run the module in a folder with the same directory hierarchy
     * as the given specFile having the last test folder replaced by src
     * and the .spec removed from the file name.
     *
     * ${projectDir}/test/my/module/path/GtmScript.spec.js
     *
     * Use it like
     *   mockedmock.requireTestModuleForSpecFile(__filename);
     *
     * Will run
     * ${projectDir}/src/my/module/path/GtmScript.js
     *
     * @param specFile
     */
    requireTestModuleForSpecFile(specFile, wrapToGetResult=true) {
        const { path, filename } = this._getSpecFileInfo(specFile);
        return this.requireTestModule(`${path}/${filename}`, wrapToGetResult)
    }

    /**
     * Includes/requires the module at the given path while mocking its environment to point to this instance of GmgMockedmock.
     * It is effectively running the module/script. If the script is returning a value (like for example a variable script should)
     * this value is returned in case wrapToGetResult is true.
     *
     * @param testModule The module (file name) to be required.
     * @param wrapToGetResult Whether the script should be wrapped to access its result (i.e. return value, not export)
     * @returns Either the loaded module (the test module that was required), or, if wrapToGetResult is true, the result of the script
     */
    requireTestModule(testModule, wrapToGetResult=true) {
        try {
            let mockedMethods = this._getMockedMethodMap();
            mockedMethods.JSON = this.JSON;
            mockedMethods.Math = this.Math;
            mockedMethods.Object = this.Object;
            global.data = this.fieldData;
            mockedMethods.Promise = {
                all: this._promiseAll.bind(this),
                create: this._promiseCreate.bind(this)
            };

            proxyquire.noCallThru();
            if (wrapToGetResult) {
                testModule = this._wrapFileInTmpForResult(testModule);
            }
            let loadedModule = proxyquire.load(testModule, mockedMethods);
            return wrapToGetResult ? loadedModule.scriptResult : loadedModule;
        } catch (error) {
            console.error(`Failed to require file: ${testModule}`, error);
            throw error; // Re-throw the error for Jasmine to handle
        }
    }

    _wrapFileInTmpForResult(fileToWrap) {
        const fileName = path.basename(fileToWrap);
        const tmpPath = path.join(os.tmpdir(), fileName);

        const originalContents = fs.readFileSync(fileToWrap, 'utf8');
        const wrappedContents = `
function executeGtmScriptForResult() {
    ${originalContents}
}
module.exports.scriptResult = executeGtmScriptForResult();
`;
        fs.writeFileSync(tmpPath, wrappedContents, 'utf8');
        return tmpPath;
    }

    getIssuedPromises() {
        return Promise.all(this.issuedPromises);
    }

    _promiseAll(promises) {
        let promise = Promise.all(promises);
        this.issuedPromises.push(promise);
        return promise;
    }

    _promiseCreate(config) {
        let promise = Promise.create(config);
        this.issuedPromises.push(promise);
        return promise;
    }

    getSandbox() {
        return this.sandbox;
    }

}

class Sandbox {
    constructor(sandboxMock) {
        this.sandboxMock = sandboxMock;
    }

    getTimestampMillis() {
        this.sandboxMock.apiCalled("getTimestampMillis");
        return Date.now();
    }

    getTimestamp() {
        this.sandboxMock.apiCalled("getTimestamp");
        return this.getTimestampMillis();
    }

    createRegex(pattern, flags) {
        this.sandboxMock.apiCalled("createRegex");
        try {
            return new RegExp(pattern, flags);
        } catch (error) {
            return null;
        }
    }

    testRegex(regEx, string) {
        this.sandboxMock.apiCalled("testRegex");
        if (!string)
            return false;
        return regEx.test(string);
    }

    sha256Sync(input, options={}) {
        this.sandboxMock.apiCalled("sha256Sync");
        let outputEncoding = options?.outputEncoding ? options?.outputEncoding : 'base64';
        return crypto.createHash('sha256').update(input).digest(outputEncoding);
    }

    sha256(input, onSuccess, options={}) {
        this.sandboxMock.apiCalled("sha256");
        let digest = this.sha256Sync(input, options);
        if (onSuccess)
            onSuccess(digest);
    }

    parseUrl(urlStr) {
        this.sandboxMock.apiCalled("parseUrl");
        try {
            let parsedUrl = new URL(urlStr);
            const paramsObject = {};
            parsedUrl.searchParams.forEach((value, key) => {
                paramsObject[key] = value;
            });
            return {
                protocol: parsedUrl.protocol,
                username: parsedUrl.username,
                password: parsedUrl.password,
                host: parsedUrl.host,
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                pathname: parsedUrl.pathname,
                search: parsedUrl.search,
                searchParams: paramsObject,
                hash: parsedUrl.hash
            }
        } catch (e) {
            // this._log('parseUrl', e);
            return undefined;
        }
    }

    logToConsole(...data) {
        this.sandboxMock.apiCalled("logToConsole");
        console.log('GtmSandboxMock: ---');
        console.log(...data);
        console.log('---');
    }

    callLater(handler) {
        this.sandboxMock.apiCalled("callLater");
        setTimeout(handler, 0);
    }

    claimRequest() {
        this.sandboxMock.apiCalled("claimRequest");
        try {
            throw new Error();
        } catch (error) {
            if (error.stack.includes('callLater') || error.stack.includes('runContainer')) {
                throw new Error('claimRequest being called asynchronously, you have to call it in the main client execution stack');
            }
        }
        this.sandboxMock.claimRequestCalled = true;
    }

    getContainerVersion() {
        this.sandboxMock.apiCalled("getContainerVersion");
        return this.sandboxMock.containerVersion;
    }

    returnResponse() {
        this.sandboxMock.apiCalled("returnResponse");
        this.sandboxMock.returnedResponse = JSON.parse(JSON.stringify(this.sandboxMock.response));
    }

    setResponseHeader(name, value) {
        this.sandboxMock.apiCalled("setResponseHeader");
        if (!value && this.sandboxMock.response.headers.hasOwnProperty(name)) {
            delete this.sandboxMock.response.headers[name];
        }
        if (value) {
            this.sandboxMock.response.headers[name] = value;
        }
    }

    setResponseStatus(statusCode) {
        this.sandboxMock.apiCalled("setResponseStatus");
        this.sandboxMock.response.statusCode = statusCode;
    }

    setResponseBody(body) {
        this.sandboxMock.apiCalled("setResponseBody");
        this.sandboxMock.response.body = body;
    }

    setPixelResponse() {
        this.sandboxMock.apiCalled("setPixelResponse");
    }

    getRemoteAddress() {
        this.sandboxMock.apiCalled("getRemoteAddress");
        return this.sandboxMock.request?.remoteAddress;
    }

    getRequestBody() {
        this.sandboxMock.apiCalled("getRequestBody");
        return this.sandboxMock.request?.body;
    }

    getRequestMethod() {
        this.sandboxMock.apiCalled("getRequestMethod");
        return this.sandboxMock.request?.method;
    }

    getRequestPath() {
        this.sandboxMock.apiCalled("getRequestPath");
        return this.sandboxMock.request?.path;
    }

    getRequestQueryString() {
        this.sandboxMock.apiCalled("getRequestQueryString");
        return this.sandboxMock.request?.queryString;
    }

    getRequestQueryParameters() {
        this.sandboxMock.apiCalled("getRequestQueryParameters");
        return this.sandboxMock.request?.queryParameters;
    }

    getRequestQueryParameter(name) {
        this.sandboxMock.apiCalled("getRequestQueryParameter");
        return this.sandboxMock.request?.queryParameters?.[name];
    }

    runContainer() {
        this.sandboxMock.apiCalled("runContainer");
    }

    fromBase64() {
        this.sandboxMock.apiCalled("fromBase64");
    }

    sendHttpGet(url, options={}) {
        this.sandboxMock.apiCalled("sendHttpGet");
        if (!options) {
            options = {}
        }
        options.method = 'GET';
        return this.sendHttpRequest(url, options);
    }

    /**
     * Creates the specfied http request and returns a promise that will resolve with the response.
     */
    sendHttpRequest(url, options = {}, body = '') {
        this.sandboxMock.apiCalled("sendHttpRequest");
        let reqObj = {url, options, body, mocked: false};
        this.sandboxMock.issuedOutgoingRequests.push(reqObj);
        let mockedReq = this.sandboxMock._findMockedRequest(url, options, body);
        let resultPromise;

        if (mockedReq) {
            reqObj.mocked = true;
            resultPromise = Promise.resolve(mockedReq.response);
        } else {
            let requestPromise = axios.request({
                method: options.method || 'GET',
                url,
                headers: options.headers || {},
                data: body,
                timeout: options.timeout || 15000,
                responseType: 'text', // TODO: Not sure if hardcoding this is ok...
                ...options
            });
            resultPromise = this.sandboxMock._httpRequestProxyPromise(requestPromise, (response) => {
                return {
                    statusCode: response.status,
                    body: response.data,
                    headers: response.headers
                }
            });
        }
        this.sandboxMock.issuedPromises.push(resultPromise);
        return resultPromise;
    }

    sendPixelFromBrowser() {
        this.sandboxMock.apiCalled("sendPixelFromBrowser");
    }

    getType() {
        this.sandboxMock.apiCalled("getType");
        return this.sandboxMock.type;
    }

    generateRandom() {
        this.sandboxMock.apiCalled("generateRandom");
    }

    computeEffectiveTldPlusOne(domainOrUrl) {
        this.sandboxMock.apiCalled("computeEffectiveTldPlusOne");
        const parsedUrl = tldts.parse(domainOrUrl);
        return parsedUrl.domain;
    }

    getRequestHeader(name) {
        this.sandboxMock.apiCalled("getRequestHeader");
        return this.sandboxMock.request?.headers?.[name.toLowerCase()];
    }

    getCookieValues(name, decode = true) {
        this.sandboxMock.apiCalled("getCookieValues");
        if (this.sandboxMock.request?.cookies?.hasOwnProperty(name)) {
            const value = this.sandboxMock.request.cookies[name];
            if (Array.isArray(value)) {
                return decode ? value.map(item => decodeURIComponent(item)) : value;
            }
            return decode ? [decodeURIComponent(value)] : [value];
        } else {
            return [];
        }
    }

    setCookie(name, value, options={}, noEncode=false) {
        this.sandboxMock.apiCalled("setCookie");
        this.sandboxMock.response.cookies[name] = {value: value, options, noEncode}
    }

    decodeUri(uri) {
        this.sandboxMock.apiCalled("decodeUri");
        return decodeURI(uri);
    }

    encodeUri(uri) {
        this.sandboxMock.apiCalled("encodeUri");
        return encodeURI(uri);
    }

    encodeUriComponent(uriComponent) {
        this.sandboxMock.apiCalled("encodeUriComponent");
        return encodeURIComponent(uriComponent);
    }

    decodeUriComponent(uriComponent) {
        this.sandboxMock.apiCalled("decodeUriComponent");
        return decodeURIComponent(uriComponent);
    }

    makeString(value) {
        this.sandboxMock.apiCalled("makeString");
        return String(value)
    }

    makeNumber(value) {
        this.sandboxMock.apiCalled("makeNumber");
        return Number(value);
    }

    makeInteger(value) {
        this.sandboxMock.apiCalled("makeInteger");
        return parseInt(value);
    }

    makeTableMap(tableObj, keyColumnName='key', valueColumnName='value') {
        this.sandboxMock.apiCalled("makeTableMap");
        // Check if tableObj is an array
        if (!Array.isArray(tableObj)) {
            return null;
        }

        const resultMap = new Map();

        // Iterate over each row in the tableObj
        tableObj.forEach(row => {
            // Check if row is an object
            if (typeof row === 'object' && row !== null) {
                // Check if the key and value columns exist in the row
                if (keyColumnName in row && valueColumnName in row) {
                    resultMap.set(row[keyColumnName], row[valueColumnName]);
                }
            }
        });

        return Object.fromEntries(resultMap);
    }

    getAllEventData() {
        this.sandboxMock.apiCalled("getAllEventData");
        return this.sandboxMock.eventData;
    }

    getEventData(keyPath) {
        this.sandboxMock.apiCalled("getEventData");
        return this.sandboxMock.eventData[keyPath];
    }
}

module.exports = GtmSandboxMock;