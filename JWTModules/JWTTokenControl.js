require("dotenv").config();
const jwt = require("jsonwebtoken");

const Token = require("../Schemas/InvalidToken");
const User = require("../Schemas/User");

const AuthenticateJWTToken = async (req, res, next) => {
  var secret_key = process.env.SECRET_KEY;

  var token = req.get("Authorization") && req.get("Authorization").split(" ")[1];
  if( !token) return res.status(400).json({ message:' Session token required.'});
  
  jwt.verify(token, secret_key, async (err, user) => {

    var { EMailAddress } = req.params;
    var filter = { EMailAddress: EMailAddress };
    var Auth = await User.findOne(filter);

    var authTokenFilter = { UserId: Auth._id.toString(), JWTToken: token };
    var authToken = await Token.findOne(authTokenFilter);
    if( authToken) return res.status(401).json({ message:' Your session has ended. Please log in again.'});

    if (err) {

      var update = {
        $set: {
          Active: false,
          TwoFAStatus: false,
          LastLoginDate: new Date(),
        },
      };

      var newTokenObj = {
        UserId: Auth.id,
        JWTToken: token,
        JWTTokenExpireDate: new Date(),
      };

      var newToken = new Token(newTokenObj);

      await User.findOneAndUpdate(filter, update);
      await newToken.save();

      return res
        .status(401)
        .json({
          message:
            " Your session token is invalid or has expired. Please log in again.",
        });
    }
    req.user = user;
    next();
  });
};

module.exports = AuthenticateJWTToken;