const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
    UserId:{
        type: String
    },
    EMailAddress:{
        type: String
    },
    Token:{
        type: String
    },
    ExpiredDate:{
        type: Date
    }
});

const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);
module.exports = RefreshToken