# gtm-mocked-sandbox

gtm-mocked-sandbox is a library to test Google tagmanager scripts outside of tagmanager runtime

# Installing

```bash
npm install gtm-mocked-sandbox --save-dev
```

# Usage
Create an instance of `GtmSandboxMock` for each of your test runs

```javascript
const GtmSandboxMock = require('gtm-mocked-sandbox');

mock = new GtmSandboxMock();
```

Example test with jasmine
```javascript
describe('Script behavior', () => {
    let sandboxMock;

    beforeEach(() => {
        sandboxMock = new GtmSandboxMock();
    });

    it('Test run', () => {
        sandboxMock.setDataLayer([
            {event: 'custom event', event_property: 'custom value'},
            {general_property: 'general value'}
        ]);
        sandboxMock.requireTestModule('../src/gtm-scripts/tag-template.js');
        // expect()
    });
});
```

