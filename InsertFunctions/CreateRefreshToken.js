const CreateRefreshToken = require("../JWTModules/CreateRefreshToken");
const RefreshToken = require("../Schemas/RefreshToken");
const CalculateExpireDate = require("../MyFunctions/CalculateExpireDate");

async function InsertRefreshToken(_id, CreatedRefreshTokenEncrypted) {
  var newRefreshTokenObj = {
    UserId: _id,
    Token: CreatedRefreshTokenEncrypted,
    ExpiredDate: CalculateExpireDate({ hours: 120, minutes: 0 }),
  };

  var newRefreshToken = new RefreshToken(newRefreshTokenObj);
  var createdRefreshToken = await newRefreshToken.save();
  return createdRefreshToken.Token;
}

async function DeleteExpiredRefreshToken(_id, ExpiredRefreshTokenId) {
  var filter = { UserId: _id, _id: ExpiredRefreshTokenId };
  await RefreshToken.findOneAndDelete(filter);
}

async function CreateRefreshTokenFunction(req, res, _id) {
  var CreatedRefreshTokenEncrypted, CreatedRefreshTokenDecrypted;

  var refreshTokenFilter = { UserId: _id };
  var refreshToken = await RefreshToken.findOne(refreshTokenFilter);

  var CreatedRefreshTokenObj = CreateRefreshToken();
  CreatedRefreshTokenEncrypted = CreatedRefreshTokenObj.RefreshTokenCrypted;
  CreatedRefreshTokenDecrypted = CreatedRefreshTokenObj.RefreshTokenDecrypted;

  if (refreshToken) {

    await DeleteExpiredRefreshToken(_id, refreshToken._id.toString());
    await InsertRefreshToken(_id, CreatedRefreshTokenEncrypted);

  }else{

    await InsertRefreshToken(_id, CreatedRefreshTokenEncrypted);
  }

  return {

    RefreshTokenCrypted: CreatedRefreshTokenEncrypted,
    RefreshTokenDecrypted: CreatedRefreshTokenDecrypted,
  };
}

module.exports = CreateRefreshTokenFunction;