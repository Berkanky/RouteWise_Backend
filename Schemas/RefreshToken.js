const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
    UserId:{
        type: String,
        required: true
    },
    EMailAddress:{
        type: String,
        required: true
    },
    Token:{
        type: String,
        required: true
    },
    ExpiredDate:{
        type: Date,
        required: true
    }
});

const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);
module.exports = RefreshToken