const crypto = require('crypto');

function CreateRefreshToken(){
    var refreshToken = crypto.randomBytes(40).toString('hex');
    var hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    return hashedRefreshToken
};

module.exports = CreateRefreshToken;