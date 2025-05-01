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

app.get(
    "/country/codes",
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
        var { EMailAddress, PhoneNumber, DialCode, Type, Password } = req.body;

        var { error, value } = OTPSendSchema.validate({ PhoneNumber: PhoneNumber, EMailAddress: EMailAddress, DialCode: DialCode, Type: Type, Password: Password }, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        if( Type === 'Login'){
            var filter = { EMailAddress: EMailAddress};
            var Auth = await User.findOne(filter);
            console.log("Ön yüzden gelen Password : ", Password);
            var PasswordCheck = await SCRYPTCheck(Password, Auth.Password);
            if( !PasswordCheck) return res.status(401).json({ message:' Incorrect password. Please try again.'});
        }

        var CustomerPhoneNumber = DialCode.toString() + PhoneNumber.toString();

        var createdVerification = await createVerification(CustomerPhoneNumber);
        console.log("/send/otp/sms : ", JSON.stringify(createdVerification));

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