const AuthToken = require("../Schemas/AuthToken");

const CalculateExpireDate = require("../MyFunctions/CalculateExpireDate");


async function CreateNewAuthToken(Auth, VerificationId, Type){
    var newAuthTokenObj = {
        UserId: Auth._id.toString(),
        TokenType: Type,
        Token: VerificationId,
        TokenExpiredDate: CalculateExpireDate({hours:0, minutes: 15})
    };
    var newAuthToken = new AuthToken(newAuthTokenObj);
    var createdNewAuthToken = await newAuthToken.save();
    return createdNewAuthToken;
};

module.exports = CreateNewAuthToken;