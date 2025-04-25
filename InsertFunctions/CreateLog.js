const Log = require("../Schemas/Log");

async function CreateLog(req, res, _id, Type, DeviceDetails){
    var newLogObj = {
        UserId: _id,
        Action: Type,
        Date: new Date(),
        DeviceDetails: DeviceDetails ? [DeviceDetails] : []
    };

    var newLog = new Log(newLogObj);
    await newLog.save();
    return 
};

module.exports = CreateLog;