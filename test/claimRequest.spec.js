const GtmSandboxMock = require('../src/gtm-mocked-sandbox');
const getRelativeFile = require('./getRelativeFile')

describe('claimRequest', () => {

    it('should be able to be spyOn-ed', function () {
        let mock = new GtmSandboxMock();
        spyOn(mock.getSandbox(), 'claimRequest');
        mock.requireTestModule(getRelativeFile('./scripts/claimRequest-sync.js'));
        expect(mock.getSandbox().claimRequest).toHaveBeenCalled();
    });

    it('should throw exception if called asynchronous', function () {
        let mock = new GtmSandboxMock();
        // TODO: Need to work out how to wait for asynchronous calls to be finished
        // spyOn(sandbox, 'claimRequest');
        // expect(() => {
        //     mock.runTestForModule(getRelativeFile('./scripts/claimRequest-async.js'))
        // }).toThrow();
        // expect(mock.claimRequest).toHaveBeenCalled();
    });
});