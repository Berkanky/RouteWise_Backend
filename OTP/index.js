require("dotenv").config();

const express = require("express");
const app = express.Router();

const twilio = require("twilio"); 

var accountSid = process.env.TWILIO_ACCOUNT_SI;
var authToken = process.env.TWILIO_AUTH_TOKEN;
var createdServiceSid = process.env.TWILIO_CREATED_SERVICE_SID;
var client = twilio(accountSid, authToken);

//Şifreleme metotları.
var SCRYPTEncrypt = require("../EncryptModules/SCRYPTEncrypt");
var SCRYPTCheck = require("../EncryptModules/SCRYPTCheck");

//Global error
const asyncHandler = require("../Handler/Handler");

//Şemalar
const User = require("../Schemas/User");

// fs modülünün promises API'ını import et
const fs = require('fs').promises;
const path = require('path'); // Dosya yolunu birleştirmek için genellikle kullanılır

// JSON dosyasının yolu
const filePath = path.join(__dirname, '../CountryCodes/CountryCodes.json');

//Middlewares.
const EMailAddressControl = require("../Middleware/EMailAddressControl");
const rateLimiter = require("../Middleware/RateLimiter");
const AuthControl = require("../Middleware/AuthControl");
const InvalidTokenControlFunction = require("../Middleware/InvalidTokenControl");

//JOI Doğrulama şemaları
const OTPSendSchema = require("../JoiSchemas/OTPSendSchema");
const OTPVerifySchema = require("../JoiSchemas/OTPVerifySchema");
const DialCodePhoneNumberSchema = require("../JoiSchemas/DialCodePhoneNumberSchema");

//Şifreleme metotları.
var aes256Encrypt = require("../EncryptModules/AES256Encrypt");
var aes256Decrypt = require("../EncryptModules/AES256Decrypt");

async function readCountryCodesJSON() {
    var fileContent = await fs.readFile(filePath, 'utf8');
    var Countries = JSON.parse(fileContent);
    return Countries;
};

async function createVerification(PhoneNumber) {
    console.log("createdServiceSid : ", createdServiceSid);
    const verification = await client.verify.v2
      .services(createdServiceSid)
      .verifications.create({
        channel: "sms",
        to: PhoneNumber,
      });
  
    console.log("createVerification : ", JSON.stringify(verification));
    return verification
};

async function createVerificationCheck(PhoneNumber, VerificationCode) {
    const verificationCheck = await client.verify.v2
      .services(createdServiceSid)
      .verificationChecks.create({
        code: VerificationCode,
        to: PhoneNumber,
      });
  
    console.log("createVerificationCheck : ", JSON.stringify(verificationCheck));
    return verificationCheck
};


//Refresh Token yazılacak apilerin güvenliği için.

async function VerifyPhoneNumberWithAccountFinded(req, res, next){
    var { EMailAddress } = req.params;
    var { DialCode, PhoneNumber } = req.body;

    var { error, value } = DialCodePhoneNumberSchema.validate({DialCode, PhoneNumber}, { abortEarly: false });
    if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

    var filter = { EMailAddress: EMailAddress };
    var Auth = await User.findOne(filter);

    if( !Auth) return res.status(404).json({ message: " No account found with that email address." });
    if( Auth.IsTemporary) return res.status(409).json({ message:' Registration is not complete. Please finish signing up.'});

    var AuthPhoneNumber = Auth.DialCode + Auth.PhoneNumber;

    var RequestedPhoneNumber = (DialCode).toString() + (PhoneNumber).toString();
    if( RequestedPhoneNumber !== AuthPhoneNumber) return res.status(401).json({ message:' The email address matched to the system and the phone number to be verified do not match, please try again or verify by email.'});

    next();
};  

app.get(
    "/country/codes",
    rateLimiter,
    asyncHandler(async(req, res) => {
        var Countries = await readCountryCodesJSON();
        return res.status(200).json({Countries: Countries});
    })
);

app.put(
    "/send/otp/sms/:EMailAddress",
    rateLimiter,
    EMailAddressControl,
    asyncHandler(async(req, res) => {
        var { EMailAddress } = req.params;
        var { PhoneNumber, DialCode, Type, Password } = req.body;

        var { error, value } = OTPSendSchema.validate({ PhoneNumber: PhoneNumber, EMailAddress: EMailAddress, DialCode: DialCode, Type: Type, Password: Password }, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        var CustomerPhoneNumber = DialCode.toString() + PhoneNumber.toString();

        if( Type === 'Login'){
            var filter = { EMailAddress: EMailAddress};
            var Auth = await User.findOne(filter);
            console.log("Ön yüzden gelen Password : ", Password);
            var PasswordCheck = await SCRYPTCheck(Password, Auth.Password);
            if( !PasswordCheck) return res.status(401).json({ message:' Incorrect password. Please try again.'});
        }

        if( Type === 'setPassword') {

            var filter = { EMailAddress: EMailAddress };
            var Auth = await User.findOne(filter);

            if ( !Auth) return res.status(404).json({ message: " No account found with that email address." });

            var AuthPhoneNumber = aes256Decrypt(Auth.DialCode) + aes256Decrypt(Auth.PhoneNumber);
            var IsAuthPhoneNumberVerified = AuthPhoneNumber == CustomerPhoneNumber ? true : false;

            if( !IsAuthPhoneNumberVerified ) return res.status(400).json({ message:' The phone number of this user and the phone number you entered did not match.'});
        }

        await createVerification(CustomerPhoneNumber);
        return res.status(201).json({ message:' OTP has been successfully sent, please check your phone. '});
    })
);

app.put(
    "/verify/otp/sms/:EMailAddress",
    rateLimiter,
    AuthControl,
    asyncHandler(async(req, res) => {
        var { EMailAddress, PhoneNumber, VerificationCode, DialCode, Type } = req.body;

        var { error, value } = OTPVerifySchema.validate({ PhoneNumber: PhoneNumber, EMailAddress: EMailAddress, VerificationCode: VerificationCode, DialCode: DialCode, Type: Type}, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        var Auth = req.Auth;

        var CustomerPhoneNumber = DialCode.toString() + PhoneNumber.toString();

        var verifiedVerification = await createVerificationCheck(CustomerPhoneNumber, VerificationCode);
        console.log("/verify/otp/sms : ", JSON.stringify(verifiedVerification));

        if(verifiedVerification.status != 'approved') return res.status(400).json({ message:' Verification failed, please try again.'});

        if( Type === "Login") {
            var update = {
                $set:{
                    TwoFAStatus: true
                }
            };
            await User.findByIdAndUpdate(Auth._id.toString(), update);

            return res.status(200).json({ message:' OTP verification completed successfully, please proceed to complete login.'});
        }
        if( Type === 'setPassword'){
            
            var Token = await CreateJWTToken(req, res, Auth.EMailAddress, Auth._id.toString());
            if( !Token) return res.status(500).json({ message:' Unexpected error generating session token. Please try again.'});
            
            return res.status(200).json({ message:' OTP verification completed successfully,  please continue with the reset password.', Token});
        }
        if( Type === 'Register'){
            return res.status(200).json({ message:' OTP verification completed successfully, please continue with the registration.'});
        }
    })
);

module.exports = app;