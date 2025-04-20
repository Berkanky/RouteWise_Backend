const express = require("express");
const app = express.Router();


//Fonksiyonlar.
const getDeviceDetails = require("../MyFunctions/getDeviceDetails");
const createVerifyCode = require("../MyFunctions/GenerateVerifyCode");
const FormatDateFunction = require("../MyFunctions/FormatDateFunction");
const formatBytes = require("../MyFunctions/FormatFileSize");
const GetMimeTypeDetail = require("../MyFunctions/GetMimeTypeDetail");
const CalculateExpireDate = require("../MyFunctions/CalculateExpireDate");

//Encryp Fonksiyonlar.
var SCRYPTEncrypt = require("../EncryptModules/SCRYPTEncrypt");
var BCRYPTCheck = require("../EncryptModules/SCRYPTCheck");
var aes256Encrypt = require("../EncryptModules/AES256Encrypt");
var aes256Decrypt = require("../EncryptModules/AES256Decrypt");

//Handler
const asyncHandler = require("../Handler/Handler");

//Email Template.
const RegisterEmailVerification = require("../EmailTemplates/RegisterEmailVerification");
const SetPasswordEmailVerification = require("../EmailTemplates/SetPasswordEmailVerification");
const LoginEmailVerification = require("../EmailTemplates//SigninEmailVerification");

//Middlewares.
const EMailAddressControl = require("../Middleware/EMailAddressControl");
const rateLimiter = require("../Middleware/RateLimiter");
const AuthControl = require("../Middleware/AuthControl");
const InvalidTokenControlFunction = require("../Middleware/InvalidTokenControl");

//JWT.
const AuthenticateJWTToken = require("../JWTModules/JWTTokenControl");
const CreateJWTToken = require("../JWTModules/CreateJWTToken");

//Şemalar
const User = require("../Schemas/User");
const AuthToken = require("../Schemas/AuthToken");


async function CreateNewAuthToken(Auth, VerificationId){
    var newAuthTokenObj = {
        UserId: Auth._id.toString(),
        TokenType: 'Register_Email_Verification',
        Token: VerificationId,
        TokenExpiredDate: CalculateExpireDate(0, 15)
    };
    var newAuthToken = new AuthToken(newAuthTokenObj);
    var createdNewAuthToken = await newAuthToken.save();
    return createdNewAuthToken;
};

app.post(
    "/register/email/verification/:EMailAddress",
    rateLimiter,
    EMailAddressControl,
    asyncHandler( async( req, res) => {
        var { EMailAddress } = req.params;

        var VerificationId = await RegisterEmailVerification(EMailAddress);
        console.log("Üretilmiş Verification ID : ", VerificationId);
        if( !VerificationId) return res.status(400).json({ message:' The verification code could not be sent, please try again.'});

        var Auth = await User.findOne({EMailAddress: EMailAddress});

        if( !Auth){
            var newUserObj = {
                EMailAddress: EMailAddress,
                IsTemporary: true
            };

            var newUser = new User(newUserObj);
            var createdUser = await newUser.save();

            var createdNewAuthToken = await CreateNewAuthToken(createdUser, VerificationId);
            if( !createdNewAuthToken) return res.status(400).json({ message:' There was an error sending the verification code, please try again later.'});
        }

        if( Auth && !Auth.IsTemporary) return res.status(400).json({ message:' There is already a verified account with this email address.'});

        if( Auth ){

            var AuthTokenFilter = { UserId: Auth._id.toString(), TokenType: 'Register_Email_Verification'};
            var authToken = await AuthToken.findOne(AuthTokenFilter);
            if( !authToken){

                var createdNewAuthToken = await CreateNewAuthToken(Auth, VerificationId);
                if( !createdNewAuthToken) return res.status(400).json({ message:' There was an error sending the verification code, please try again later.'});
            }else{

                var update = {
                    $set:{
                        Token: VerificationId,
                        TokenExpiredDate: CalculateExpireDate({ hours: 0, minutes: 15})
                    }
                };

                await AuthToken.findOneAndUpdate(AuthTokenFilter, update);
            }
        }

        return res.status(200).json({ message:' The verification code has been sent successfully, please check your e-mail address.'});
    })
);

app.post(
    "/register/email/verification/confirm/:EMailAddress",
    rateLimiter,
    EMailAddressControl,
    AuthControl,
    asyncHandler( async( req, res) => {
        var { EMailAddress } = req.params;
        var { VerificationId } = req.body;

        var filter = { EMailAddress: EMailAddress};
        var Auth = await User.findOne(filter);
        if( Auth && !Auth.IsTemporary) return res.status(400).json({ message:' There is already a verified account with this email address.'});

        var AuthTokenFilter = { UserId: Auth._id.toString(), TokenType: 'Register_Email_Verification'};
        var authToken = await AuthToken.findOne(AuthTokenFilter);

        if( !authToken) return res.status(400).json({ message:' Verification code error, please resend the verification code for the registration process.'});

        if( authToken.Token != VerificationId) return res.status(400).json({ message:' The verification code did not match, please check the verification code.'});
        if( new Date() > new Date(String(authToken.TokenExpiredDate))) return res.status(400).json({ message:' The verification code has expired, please send the verification code again.'});
        
        var AuthTokenUpdate = {
            $unset:{
                Token:'',
                TokenExpiredDate: ''
            }
        };

        await AuthToken.findOneAndUpdate(AuthTokenFilter, AuthTokenUpdate);

        return res.status(200).json({ message:'Verification successful, please follow the instructions to finish the registration process.'});
    })
);

app.post(
    "/register/complete/:EMailAddress",
    rateLimiter,
    EMailAddressControl,
    AuthControl,
    asyncHandler( async( req, res) => {
        var { EMailAddress } = req.params;
        var { LoginData } = req.body;

        if( !Object.keys(LoginData).length) return res.status(400).json({ message:' Please fill the required fieds.'});

        var filter = { EMailAddress: EMailAddress};
        var Auth = await User.findOne(filter);
        if(!Auth.IsTemporary) return res.status(400).json({message:' An account already exists with this email address.'});

        var update = {
            Name: aes256Encrypt(LoginData.Name),
            Surname: aes256Encrypt(LoginData.Surname),
            Password: await SCRYPTEncrypt(LoginData.Password),
            CreatedDate: new Date(),
            IsTemporary: false
        };

        await User.findOneAndUpdate(filter, update);
        return res.status(200).json({message:' The user has been successfully created, you can log in.'});
    })
);

module.exports = app;