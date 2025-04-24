const EMailAddressRegex = require("../MyFunctions/EMailAddressRegex");

const EMailAddressControl = async (req, res, next) => {

  if (!req.params.EMailAddress || !EMailAddressRegex(req.params.EMailAddress))
    return res
      .status(422)
      .json({
        message: " Please provide a valid email address.",
      });
  next();
};

module.exports = EMailAddressControl;