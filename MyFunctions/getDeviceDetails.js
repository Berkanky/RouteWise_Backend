const getDeviceDetails = (req, res) => {
  var ipAddress = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  var userAgent = req.headers["user-agent"];
  var DeviceId = req.body?.DeviceId || req.params?.DeviceId || '';
  return { IPAddress: ipAddress, DeviceName: userAgent, Date: new Date(), DeviceId: DeviceId };
};

module.exports = getDeviceDetails;
