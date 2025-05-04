const Token = require("../Schemas/InvalidToken");

async function CreateInvalidToken(req, res, _id, tokenValue){
    var token = req.get("Authorization") && req.get("Authorization").split(" ")[1];
    if( !token && tokenValue) token = tokenValue;
    var newTokenObj = {
        UserId: _id,
        JWTToken: token,
        JWTTokenExpireDate: new Date()
    };

    var newToken = new Token(newTokenObj);
    await newToken.save();
    return
};

module.exports = CreateInvalidToken;