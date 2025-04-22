require("dotenv").config();

const Token = require("../Schemas/InvalidToken");
const User = require("../Schemas/User");

const jwt = require("jsonwebtoken");

var secret_key = process.env.SECRET_KEY;

const AuthenticateJWTToken = async (req, res, next) => {
  var token = req.get("Authorization") && req.get("Authorization").split(" ")[1];
  jwt.verify(token, secret_key, async (err, user) => {

    var { EMailAddress } = req.params;
    var filter = { EMailAddress: EMailAddress };
    var Auth = await User.findOne(filter);

    var authTokenFilter = { UserId: Auth._id.toString(), JWTToken: token };
    var authToken = await Token.findOne(authTokenFilter);
    if( authToken) return res.status(403).json({ message:' Session has been terminated, please log in again.'});

    if (err) {
      var update = {
        $set: {
          Active: false,
          TwoFAStatus: false,
          LastLoginDate: new Date(),
        },
      };

      await User.findOneAndUpdate(filter, update);

      var authToken = await Token.findOne(authTokenFilter);
      if (!authToken) {
        var newTokenObj = {
          UserId: Auth.id,
          JWTToken: token,
          JWTTokenExpireDate: new Date(),
        };

        var newToken = new Token(newTokenObj);
        await newToken.save();
      }

      return res
        .status(403)
        .json({
          message:
            "Kullanıcı geçici tokeni geçersiz, oturum zaman aşımına uğramış bulunmaktadır. Lütfen tekrar deneyiniz. ",
        });
    }
    req.user = user;
    next();
  });
};

module.exports = AuthenticateJWTToken;
