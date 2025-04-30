const EMailAddressRegex = require("../MyFunctions/EMailAddressRegex");

const EMailAddressControl = async (req, res, next) => {
  var { EMailAddress } = req.params;
  if (!EMailAddress || !EMailAddressRegex(EMailAddress)) return res.status(422).json({ message: " Please provide a valid email address." });
  req.EMailAddress = EMailAddress;
  next();
};

module.exports = EMailAddressControl;