const CreateRefreshToken = require("../JWTModules/CreateRefreshToken");
const RefreshToken = require("../Schemas/RefreshToken");
const CalculateExpireDate = require("../MyFunctions/CalculateExpireDate");

async function CreateRefreshTokenFunction(req, res, _id) {

    var refreshTokenFilter = { UserId: _id };
    var refreshToken = await RefreshToken.findOne(refreshTokenFilter);
    
    if( !refreshToken || new Date() > new Date(String(refreshToken.ExpiredDate))) {
        var CreatedSHA256RefreshToken = CreateRefreshToken();
        var newRefreshTokenObj = {
            UserId: _id,
            Token: CreatedSHA256RefreshToken,
            ExpiredDate: CalculateExpireDate({ hours: 5, minutes: 0})
        };

        var newRefreshToken = new RefreshToken(newRefreshTokenObj);
        await newRefreshToken.save();
    }
    
    return
};

module.exports = CreateRefreshTokenFunction;