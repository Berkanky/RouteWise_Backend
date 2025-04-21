const mongoose = require('mongoose');

var enumList = [ 
    'Failed_Login',
    'Close_App', 
    'Register', 
    'Login', 
    'Set_Password', 
    'Register_Email_Verification', 
    'Login_Email_Verification',
    'Logout',
    'Quick_Login'
];

const LogSchema = new mongoose.Schema({
    UserId:{
        type:String,
        required:true
    },
    Action:{
        type:String,
        enum: enumList
    },
    Date:{
        type:Date
    },
    IPAddress:{
        type:String
    }
});

const Log = mongoose.model('Log', LogSchema);
module.exports = Log;