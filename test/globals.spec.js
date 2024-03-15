const GtmSandboxMock = require('../src/gtm-mocked-sandbox');
const getRelativeFile = require('./getRelativeFile')

describe('globals', () => {

    it('should be defined and run without failure', function () {
        mock = new GtmSandboxMock();
        mock.requireTestModule(getRelativeFile('./scripts/testGlobals.js'));
    });

});