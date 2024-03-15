const path = require('path');

function getRelativeFile(relativePath) {
    return path.join(path.dirname(getCallingFileName()), relativePath);
}

function getCallingFileName() {
    if (module.parent && module.parent.filename) {
        return module.parent.filename;
    } else {
        return __filename;
    }
}

module.exports = getRelativeFile;