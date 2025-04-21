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
var SCRYPTCheck = require("../EncryptModules/SCRYPTCheck");
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

//Insert fonksiyonları.
const CreateLog = require("../InsertFunctions/CreateLog");
const CreateNewAuthToken = require("../InsertFunctions/CreateAuthToken");

//Kayıt ol 2fa gönder.
app.post(
    "/register/email/verification/:EMailAddress",
    rateLimiter,
    EMailAddressControl,
    asyncHandler( async( req, res) => {
        var { EMailAddress } = req.params;
        var Type = 'Register_Email_Verification';
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

            var createdNewAuthToken = await CreateNewAuthToken(createdUser, VerificationId, Type);
            if( !createdNewAuthToken) return res.status(400).json({ message:' There was an error sending the verification code, please try again later.'});
        }

        if( Auth && !Auth.IsTemporary) return res.status(400).json({ message:' There is already a verified account with this email address.'});

        if( Auth ){

            var AuthTokenFilter = { UserId: Auth._id.toString(), TokenType: Type};
            var authToken = await AuthToken.findOne(AuthTokenFilter);
            if( !authToken){

                var createdNewAuthToken = await CreateNewAuthToken(Auth, VerificationId, Type);
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

//Kayıt ol 2fa onayla.
app.post(
    "/register/email/verification/confirm/:EMailAddress",
    rateLimiter,
    EMailAddressControl,
    AuthControl,
    asyncHandler( async( req, res) => {
        var { EMailAddress } = req.params;
        var { VerificationId } = req.body;
        var Type = 'Register_Email_Verification';
        var filter = { EMailAddress: EMailAddress};
        var Auth = await User.findOne(filter);
        if( Auth && !Auth.IsTemporary) return res.status(400).json({ message:' There is already a verified account with this email address.'});

        var AuthTokenFilter = { UserId: Auth._id.toString(), TokenType: Type};
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

//Kayıt ol
app.post(
    "/register/complete/:EMailAddress",
    rateLimiter,
    EMailAddressControl,
    AuthControl,
    asyncHandler( async( req, res) => {
        var { EMailAddress } = req.params;
        var { RegisterData } = req.body;
        var Type = 'Register';

        console.log("Kayıt ol işlemi Kullanıcı bilgileri : ", JSON.stringify(RegisterData));

        if( !Object.keys(RegisterData).length) return res.status(400).json({ message:' Please fill the required fieds.'});

        var filter = { EMailAddress: EMailAddress};
        var Auth = await User.findOne(filter);
        if(!Auth.IsTemporary) return res.status(400).json({message:' An account already exists with this email address.'});
        
        var update = {
            Name: aes256Encrypt(RegisterData.Name),
            Surname: aes256Encrypt(RegisterData.Surname),
            Password: await SCRYPTEncrypt(RegisterData.Password),
            CreatedDate: new Date(),
            IsTemporary: false,

        };

        await User.findOneAndUpdate(filter, update);
        await CreateLog(req, res, Auth._id.toString(), Type);

        return res.status(200).json({message:' The user has been successfully created, you can log in.'});
    })
);

//Giriş yap 2fa gönder.
app.post(
    '/login/email/verification/:EMailAddress',
    rateLimiter,
    EMailAddressControl,
    AuthControl,
    asyncHandler( async(req, res) => {
        var { EMailAddress } = req.params;
        var { Password } = req.body;
        var Type = 'Login_Email_Verification';

        if( !Password) return res.status(400).json({ message:' Please enter a valid password.'});

        var filter = { EMailAddress: EMailAddress};
        var Auth = await User.findOne(filter);

        if( Auth.IsTemporary) return res.status(400).json({ message:' User verification is incomplete, please complete the registration process.'});
        
        var PasswordCheck = await SCRYPTCheck(Password, Auth.Password);

        if( !PasswordCheck) return res.status(400).json({ message:' User password did not match, please check your password and login again.'});

        var VerificationId = await LoginEmailVerification(EMailAddress);
        if( !VerificationId) return res.status(400).json({ message:' The verification code could not be sent, please try again.'});


        var AuthTokenFilter = { UserId: Auth._id.toString(), TokenType: Type};
        var authToken = await AuthToken.findOne(AuthTokenFilter);
        if( !authToken){

            var createdNewAuthToken = await CreateNewAuthToken(Auth, VerificationId, Type);
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

        return res.status(200).json({ message:' The verification code has been sent successfully, please check your e-mail address.'});
    })
);

//Giriş yap 2fa onayla.
app.post(
    "/login/email/verification/confirm/:EMailAddress",
    rateLimiter,
    EMailAddressControl,
    AuthControl,
    asyncHandler( async( req, res) => {
        var { EMailAddress } = req.params;
        var { VerificationId } = req.body;
        var Type = 'Login_Email_Verification';

        var filter = { EMailAddress: EMailAddress};
        var Auth = await User.findOne(filter);
        if( Auth.IsTemporary) return res.status(400).json({ message:' User verification is incomplete, please complete the registration process.'});

        var AuthTokenFilter = { UserId: Auth._id.toString(), TokenType: Type};
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

        var update = {
            $set:{
                TwoFAStatus: true
            }
        };

        await User.findOneAndUpdate(filter, update);

        return res.status(200).json({ message:'Verification successful, please follow the instructions to finish the login process.'});
    })
);

//Giriş yap.
app.post(
    '/login/:EMailAddress',
    rateLimiter,
    EMailAddressControl,
    AuthControl,
    asyncHandler( async( req, res) => {
        var { EMailAddress } = req.params;
        var { LoginData, Password } = req.body;
        var Type = 'Login';

        if( !Password) return res.status(400).json({ message:' Please enter a valid password.'});

        var filter = { EMailAddress: EMailAddress};
        var Auth = await User.findOne(filter);

        if( !Auth.TwoFAStatus) return res.status(400).json({ message:' User 2FA verification is incomplete, please restart the login process.'});
        if( Auth.IsTemporary) return res.status(400).json({ message:' User verification is incomplete, please complete the registration process.'});
        
        var PasswordCheck = await SCRYPTCheck(Password, Auth.Password);
        
        if( !PasswordCheck) return res.status(400).json({ message:' User password did not match, please check your password and login again.'});

        var TrustedDevices = Auth.TrustedDevices;

        if( LoginData.IsRemindDeviceActive){
            var DeviceDetails = LoginData.DeviceDetails;
            DeviceDetails.DeviceName = aes256Encrypt(DeviceDetails.DeviceName);
            DeviceDetails.Platform = aes256Encrypt(DeviceDetails.Platform);
            DeviceDetails.Model = aes256Encrypt(DeviceDetails.Model);
            DeviceDetails.OperatingSystem = aes256Encrypt(DeviceDetails.OperatingSystem);
            DeviceDetails.Manufacturer = aes256Encrypt(DeviceDetails.Manufacturer);
            DeviceDetails.IPAddress = aes256Encrypt(getDeviceDetails(req, res).IPAddress);
            DeviceDetails.Date = new Date();

            if( TrustedDevices && TrustedDevices.length && !TrustedDevices.some(function(item){ return aes256Decrypt(item.DeviceId) == DeviceDetails.DeviceId })){
                
                DeviceDetails.DeviceId = aes256Encrypt(DeviceDetails.DeviceId);
                TrustedDevices.push(DeviceDetails);
            }else{

                DeviceDetails.DeviceId = aes256Encrypt(DeviceDetails.DeviceId);
                TrustedDevices = [DeviceDetails];
            }
        }

        var update = {
            $set:{
                Active: true,
                TrustedDevices: TrustedDevices
            },
            $unset:{
                LastLoginDate: ''
            }
        };

        var updatedAuth = await User.findOneAndUpdate(filter, update, {new: true}).lean();
        await CreateLog(req, res, Auth._id.toString(), Type);

        var Token = await CreateJWTToken(req, res, EMailAddress, Auth._id.toString());
        if( !Token) return res.status(400).json({ message:' Session token could not be created, please try again.'});

        updatedAuth.Name = aes256Decrypt(updatedAuth.Name);
        updatedAuth.Surname = aes256Decrypt(updatedAuth.Surname);

        updatedAuth.TrustedDevices.forEach(function(row){
            for(var key in row){
                if( key != 'Date') row[key] = aes256Decrypt(row[key]);
            }
        });

        console.log("login servisinden dönen kullanıcı bilgileri : ", JSON.stringify(updatedAuth));

        return res.status(200).json({message:' Login completed successfully, welcome.', Token, UserData: updatedAuth});
    })
);

module.exports = app;