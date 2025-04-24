const jwt = require("jsonwebtoken");
require("dotenv").config(); // .env dosyasını yükler

const CreateJWTToken = async (req, res, EMailAddress, UserId) => {

  var secret_key = process.env.SECRET_KEY;
  var token = jwt.sign( { EMailAddress: EMailAddress, UserId: UserId }, secret_key, { expiresIn: "5h" });
  if (!token) return res.status(500).json({ message: " Unable to generate session token. Please try again later." });
  return token;
};

module.exports = CreateJWTToken;
