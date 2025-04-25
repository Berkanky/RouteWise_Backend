const CreateRefreshToken = require("../JWTModules/CreateRefreshToken");
const RefreshToken = require("../Schemas/RefreshToken");
const CalculateExpireDate = require("../MyFunctions/CalculateExpireDate");

async function InsertRefreshToken(_id, CreatedSHA256RefreshToken){

    var newRefreshTokenObj = {
        UserId: _id,
        Token: CreatedSHA256RefreshToken,
        ExpiredDate: CalculateExpireDate({ hours: 5, minutes: 0})
    };

    var newRefreshToken = new RefreshToken(newRefreshTokenObj);
    var createdRefreshToken = await newRefreshToken.save();
    return createdRefreshToken.Token
};  

async function DeleteExpiredRefreshToken(_id, ExpiredRefreshTokenId){

    var filter = { UserId: _id, _id: ExpiredRefreshTokenId};
    await RefreshToken.findOneAndDelete(filter);
};

async function CreateRefreshTokenFunction(req, res, _id) {

    var CreatedRefreshTokenObj = CreateRefreshToken();
    var CreatedSHA256RefreshToken = CreatedRefreshTokenObj.RefreshTokenCrypted;
    var CreatedRefreshTokenDecrypted = CreatedRefreshTokenObj.RefreshTokenDecrypted;

    var refreshTokenFilter = { UserId: _id };
    var refreshToken = await RefreshToken.findOne(refreshTokenFilter);

    var RefreshTokenAvaliable = false;

    if( !refreshToken) await InsertRefreshToken(_id, CreatedSHA256RefreshToken);

    if( refreshToken && new Date() > new Date(String(refreshToken.ExpiredDate))) {

        await DeleteExpiredRefreshToken(_id, refreshToken._id.toString());
        await InsertRefreshToken(_id, CreatedSHA256RefreshToken);
    }else{
        RefreshTokenAvaliable = true;
    }

    return { RefreshTokenCrypted: RefreshTokenAvaliable ? refreshToken.Token  : CreatedSHA256RefreshToken, RefreshTokenDecrypted: CreatedRefreshTokenDecrypted}
};  

module.exports = CreateRefreshTokenFunction;