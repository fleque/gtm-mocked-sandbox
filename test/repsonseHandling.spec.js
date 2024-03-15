const GtmSandboxMock = require('../src/gtm-mocked-sandbox');
const getRelativeFile = require('./getRelativeFile')

describe('outgoing requests', () => {

    it('mockGetReturnedResponse holds correct values', function () {
        let mock = new GtmSandboxMock();
        spyOn(mock.getSandbox(), 'setResponseStatus');
        mock.requireTestModule(getRelativeFile('./scripts/returnResponse.js'));
        expect(mock.getSandbox().setResponseStatus).toHaveBeenCalledWith(200);
        expect(mock.getReturnedResponse().statusCode).toBe(200);
        expect(Object.keys(mock.getReturnedResponse().headers).length).toBe(1);
        expect(Object.keys(mock.getReturnedResponse().cookies).length).toBe(1);
        expect(JSON.parse(mock.getReturnedResponse().body).foo).toBeDefined();
        expect(JSON.parse(mock.getReturnedResponse().body).bar).not.toBeNull();
    });

});