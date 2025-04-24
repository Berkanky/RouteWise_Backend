const User = require("../Schemas/User");

const AuthControl = async (req, res, next) => {

  var { EMailAddress } = req.params;
  var filter = { EMailAddress: EMailAddress};
  var Auth = await User.findOne(filter);
  if ( !Auth) return res.status(404).json({ message: " No account found with that email address." });
  next();
};

module.exports = AuthControl;