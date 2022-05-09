var { createHash } = require('crypto');

exports.sha256 = function(input) {
    return createHash('sha256').update(input).digest('hex');
}