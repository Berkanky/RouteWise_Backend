const express = require("express");
const app = express.Router();
require("dotenv").config();

//Firebase admin
const admin = require('../FirebaseAdmin'); // orijinal path’e göre düzelt

//Fonksiyonlar.
const getDeviceDetails = require("../MyFunctions/getDeviceDetails");
const createVerifyCode = require("../MyFunctions/GenerateVerifyCode");
const FormatDateFunction = require("../MyFunctions/FormatDateFunction");
const formatBytes = require("../MyFunctions/FormatFileSize");
const GetMimeTypeDetail = require("../MyFunctions/GetMimeTypeDetail");
const CalculateExpireDate = require("../MyFunctions/CalculateExpireDate");
const PasswordRegex = require("../MyFunctions/PasswordRegex");

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
const RefreshToken = require("../Schemas/RefreshToken");

//Joi Doğrulama Şemaları
const RegisterUserSchema = require("../JoiSchemas/RegisterUserSchema");
const RegisterTwoFASchema = require("../JoiSchemas/RegisterTwoFASchema");
const LoginTwoFASchema = require("../JoiSchemas/LoginTwoFASchema");
const LoginUserSchema = require("../JoiSchemas/LoginUserSchema");

//Insert fonksiyonları.
const CreateLog = require("../InsertFunctions/CreateLog");
const CreateNewAuthToken = require("../InsertFunctions/CreateAuthToken");
const CreateInvalidToken = require("../InsertFunctions/CreateInvalidToken");
const CreateRefreshToken = require("../InsertFunctions/CreateRefreshToken");

//Kayıt ol 2fa gönder.
app.post(
    "/register/email/verification/:EMailAddress",
    rateLimiter,
    EMailAddressControl,
    asyncHandler( async( req, res) => {
        var { EMailAddress } = req.params;
        var Type = 'Register_Email_Verification';

        var VerificationId = await RegisterEmailVerification(EMailAddress);
        if( !VerificationId) return res.status(502).json({ message:' We couldn’t send the verification code right now. Please try again in a few minutes.'});

        var Auth = await User.findOne({EMailAddress: EMailAddress});

        if( !Auth){
            var newUserObj = {
                EMailAddress: EMailAddress, 
                IsTemporary: true
            };

            var newUser = new User(newUserObj);
            var createdUser = await newUser.save();

            var createdNewAuthToken = await CreateNewAuthToken(createdUser, VerificationId, Type);
            if( !createdNewAuthToken) return res.status(500).json({ message:' Something went wrong on our end. Please refresh the page or try again shortly.'});
        }

        if( Auth && !Auth.IsTemporary) return res.status(409).json({ message:' This email is already registered. Please log in or use a different email.'});

        if( Auth ){

            var AuthTokenFilter = { UserId: Auth._id.toString(), TokenType: Type};
            var authToken = await AuthToken.findOne(AuthTokenFilter);
            if( !authToken){

                var createdNewAuthToken = await CreateNewAuthToken(Auth, VerificationId, Type);
                if( !createdNewAuthToken) return res.status(500).json({ message:' We couldn’t refresh your verification code. Please request a new code.'});
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
        return res.status(200).json({ message:' We’ve sent a verification code to your email. Please enter it to continue.'});
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

        var { error, value } = RegisterTwoFASchema.validate({ VerificationId: VerificationId }, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        var Type = 'Register_Email_Verification';
        var filter = { EMailAddress: EMailAddress};
        var Auth = await User.findOne(filter);
        if( Auth && !Auth.IsTemporary) return res.status(409).json({ message:' This email is already verified. Please log in instead.'});

        var AuthTokenFilter = { UserId: Auth._id.toString(), TokenType: Type};
        var authToken = await AuthToken.findOne(AuthTokenFilter);

        if( !authToken) return res.status(404).json({ message:' No pending verification found. Please request a new code.'});

        if( authToken.Token != VerificationId) return res.status(400).json({ message:' The code you entered is incorrect. Please check and try again.'});
        if( new Date() > new Date(String(authToken.TokenExpiredDate))) return res.status(410).json({ message:' Your verification code has expired. Please request a new one.'});
        
        var AuthTokenUpdate = {
            $unset:{
                Token:'',
                TokenExpiredDate: ''
            }
        };

        await AuthToken.findOneAndUpdate(AuthTokenFilter, AuthTokenUpdate);
        return res.status(200).json({ message:' Your email has been verified! Please continue with the registration.'});
    })
);

//Kayıt ol servisi.
app.post(   
    "/register/complete/:EMailAddress",
    rateLimiter,
    EMailAddressControl,
    AuthControl,
    asyncHandler( async( req, res) => {
        var { EMailAddress } = req.params;
        var { RegisterData } = req.body;
        var Type = 'Register';

        var { error, value } = RegisterUserSchema.validate(RegisterData, { abortEarly: false });

        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        var filter = { EMailAddress: EMailAddress};
        var Auth = await User.findOne(filter);
        if(!Auth.IsTemporary) return res.status(409).json({message:' An account with this email is already active. Please log in.'});
        
        var update = {
            Name: aes256Encrypt(RegisterData.Name),
            Surname: aes256Encrypt(RegisterData.Surname),
            Password: await SCRYPTEncrypt(RegisterData.Password),
            CreatedDate: new Date(),
            IsTemporary: false,
        };

        await User.findOneAndUpdate(filter, update);
        await CreateLog(req, res, Auth._id.toString(), Type);

        return res.status(200).json({message:' Your account has been created! You may now log in.'});
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

        if( !Password) return res.status(400).json({ message:' Please provide your password to continue.'});

        var filter = { EMailAddress: EMailAddress};
        var Auth = await User.findOne(filter);

        if( Auth.IsTemporary) return res.status(409).json({ message:' Your registration isn’t complete yet. Please finish signing up first.'});
        
        var PasswordCheck = await SCRYPTCheck(Password, Auth.Password);

        if( !PasswordCheck) return res.status(401).json({ message:' Incorrect password. Please try again.'});

        var VerificationId = await LoginEmailVerification(EMailAddress);
        if( !VerificationId) return res.status(502).json({ message:' We couldn’t send the code right now. Please try again in a few minutes.'});


        var AuthTokenFilter = { UserId: Auth._id.toString(), TokenType: Type};
        var authToken = await AuthToken.findOne(AuthTokenFilter);
        if( !authToken){

            var createdNewAuthToken = await CreateNewAuthToken(Auth, VerificationId, Type);
            if( !createdNewAuthToken) return res.status(500).json({ message:' Unexpected error while generating the verification code. Please try again.'});
        }else{

            var update = {
                $set:{
                    Token: VerificationId,
                    TokenExpiredDate: CalculateExpireDate({ hours: 0, minutes: 15})
                }
            };

            await AuthToken.findOneAndUpdate(AuthTokenFilter, update);
        }           

        return res.status(200).json({ message:' erification code sent! Please check your email to proceed.'});
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

        var { error, value } = LoginTwoFASchema.validate({ VerificationId: VerificationId }, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        var filter = { EMailAddress: EMailAddress};
        var Auth = await User.findOne(filter);

        if( Auth.IsTemporary) return res.status(409).json({ message:' Registration isn’t complete. Please finish signing up first.'});

        var AuthTokenFilter = { UserId: Auth._id.toString(), TokenType: Type};
        var authToken = await AuthToken.findOne(AuthTokenFilter);

        if( !authToken) return res.status(404).json({ message:' No verification request found. Please request a new code.'});

        if( authToken.Token != VerificationId) return res.status(400).json({ message:' The code you entered is incorrect. Please try again.'});
        if( new Date() > new Date(String(authToken.TokenExpiredDate))) return res.status(410).json({ message:' Your verification code has expired. Please request a new one.'});
        
        var AuthTokenUpdate = {
            $unset:{
                Token:'',
                TokenExpiredDate: ''
            }
        };

        await AuthToken.findOneAndUpdate(AuthTokenFilter, AuthTokenUpdate);

        var update = {
            $set:{
                TwoFAStatus: true,
                Active: false
            }
        };

        await User.findOneAndUpdate(filter, update);

        return res.status(200).json({ message:' Verification successful! Please proceed to complete login.'});
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
        var { LoginData  } = req.body;

        var { error, value } = LoginUserSchema.validate(LoginData, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        var Type = 'Login';
        var Password = LoginData.Password;

        var filter = { EMailAddress: EMailAddress};
        var Auth = await User.findOne(filter);

        if( !Auth.TwoFAStatus) return res.status(403).json({ message:' 2FA verification is incomplete. Please restart login.'});
        if( Auth.IsTemporary) return res.status(409).json({ message:' Registration is not complete. Please finish signing up.'});
        
        var PasswordCheck = await SCRYPTCheck(Password, Auth.Password);
        
        if( !PasswordCheck) return res.status(401).json({ message:' Incorrect password. Please try again.'});

        var Token = await CreateJWTToken(req, res, EMailAddress, Auth._id.toString());
        if( !Token) return res.status(500).json({ message:' Unexpected error generating verification code. Please try again.'});

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
            }else if( !TrustedDevices.length){

                DeviceDetails.DeviceId = aes256Encrypt(DeviceDetails.DeviceId);
                TrustedDevices = [DeviceDetails];
            }

            await CreateRefreshToken(req, res, Auth._id.toString());
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

        updatedAuth.Name = aes256Decrypt(updatedAuth.Name);
        updatedAuth.Surname = aes256Decrypt(updatedAuth.Surname);
        updatedAuth.TrustedDevices = [];

        /* updatedAuth.TrustedDevices.forEach(function(row){
            for(var key in row){
                if( key != 'Date') row[key] = aes256Decrypt(row[key]);
            }
        }); */

        return res.status(200).json({message:' The login process was successful, welcome.', Token, UserData: updatedAuth});
    })
);

//Çıkış yap
app.put(
    '/logout/:EMailAddress',
    rateLimiter,
    EMailAddressControl,    
    AuthControl,
    AuthenticateJWTToken,
    asyncHandler( async(req, res) => {
        var { EMailAddress } = req.params;
        var Type = 'Logout';
        var filter = { EMailAddress: EMailAddress};
        var Auth = await User.findOne(filter);

        if( !Auth.Active || !Auth.TwoFAStatus) return res.status(401).json({ message:' You are not currently logged in.'}); 

        var update = {
            $set:{
                Active: false,
                TwoFAStatus: false
            },
            $unset:{
                LastLoginDate: ''
            }
        };

        await User.findOneAndUpdate(filter, update);
        await CreateLog(req, res, Auth._id.toString(), Type);
        await CreateInvalidToken(req, res, Auth._id.toString());

        return res.status(200).json({ message:' You have been logged out successfully. Come back soon!'});
    })
);

//Hızlı giriş.
app.get(
    "/auto/login/devices/:DeviceId",
    rateLimiter,
    asyncHandler( async(req, res) => {
        var { DeviceId } = req.params;
        var Type = "Auto_Login";
        if( !DeviceId) return res.status(404).json({message:' An error occurred while retrieving device information.'});

        var TrustedDevices = [];

        var Users = await User.find().lean();
        if( !Users.length) return res.status(404).json({ message:' User not found.'});

        var TrustedDevice = {};
        
        Users.forEach(function(row){
            if( 'TrustedDevices' in row && row["TrustedDevices"].length) {
                row.TrustedDevices.forEach(function(device){

                    if( device.DeviceId ){
                        if( aes256Decrypt(device.DeviceId) == DeviceId) {
                            TrustedDevice = { _id: row._id.toString(), Name: aes256Decrypt(row.Name), Surname: aes256Decrypt(row.Surname), EMailAddress: row.EMailAddress };
                            TrustedDevices.push(TrustedDevice);
                        }
                    }
                });
            }
        });
        
        if( !TrustedDevices.length) return res.status(404).json({ message:' Saved device pairing failed.'});

        var AutoLoginDevice = TrustedDevices[0];
        var EMailAddress = AutoLoginDevice["EMailAddress"];
        
        var filter = { EMailAddress: EMailAddress};

        var update = {
            $set:{
                Active: true,
                TwoFAStatus: true
            },
            $unset:{
                LastLoginDate: ''
            }
        };

        var updatedAuth = await User.findOneAndUpdate(filter, update, { new: true }).lean();
        await CreateLog(req, res, updatedAuth._id.toString(), Type);

        var Token = await CreateJWTToken(req, res, EMailAddress, updatedAuth._id.toString());
        if( !Token) return res.status(500).json({ message:' Unexpected error generating verification code. Please try again.'});

        updatedAuth.Name = aes256Decrypt(updatedAuth.Name);
        updatedAuth.Surname = aes256Decrypt(updatedAuth.Surname);

        updatedAuth.TrustedDevices.forEach(function(row){
            for(var key in row){
                if( key != 'Date') row[key] = aes256Decrypt(row[key]);
            }
        });

        return res.status(200).json({message:' Accounts registered on this device have been identified.', Auth: updatedAuth, Token: Token});
    })
);

module.exports = app;