var claimRequest = require('claimRequest');
var callLater = require('callLater');

callLater(() => {
    claimRequest();
})
