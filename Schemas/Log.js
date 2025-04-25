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
    'Auto_Login'
];

const TrustedDevicesSchema = new mongoose.Schema(
    {
        DeviceName:{ type: String },
        Platform: { type: String },
        Model: { type: String },
        OperatingSystem: { type: String },
        Manufacturer: { type: String },
        Type: { type: String },
        IPAddress: { type: String },
        DeviceId : { type: String },
        Date: { type: Date }
    }
);

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
    DeviceDetails:[TrustedDevicesSchema]
});

const Log = mongoose.model('Log', LogSchema);
module.exports = Log;