const Log = require("../Schemas/Log");
const getDeviceDetails = require("../MyFunctions/getDeviceDetails");

const aes256Encrypt = require("../EncryptModules/AES256Encrypt");

async function CreateLog(req, res, _id, Action){
    var newLogObj = {
        UserId: _id,
        Action: Action,
        Date: new Date(),
        IPAddress: aes256Encrypt(getDeviceDetails(req, res).IPAddress)
    };

    var newLog = new Log(newLogObj);
    await newLog.save();
    return 
};

module.exports = CreateLog;