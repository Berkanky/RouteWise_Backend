require("dotenv").config();

const express = require("express");
const app = express.Router();

const twilio = require("twilio"); 

var accountSid = process.env.TWILIO_ACCOUNT_SI;
var authToken = process.env.TWILIO_AUTH_TOKEN;
var createdServiceSid = process.env.TWILIO_CREATED_SERVICE_SID;
var client = twilio(accountSid, authToken);

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

app.get(
    "/country/codes",
    asyncHandler(async(req, res) => {
        var Countries = await readCountryCodesJSON();
        return res.status(200).json({Countries: Countries});
    })
);

app.get(
    "/send/otp/sms",
    EMailAddressControl,
    rateLimiter,
    asyncHandler(async(req, res) => {
        var { EMailAddress, PhoneNumber, DialCode } = req.body;

        var { error, value } = OTPSendSchema.validate({ PhoneNumber: PhoneNumber, EMailAddress: EMailAddress, DialCode: DialCode }, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        var createdVerification = await createVerification(PhoneNumber);

        console.log("/send/otp/sms : ", JSON.stringify(createdVerification));

        return res.status(201).json({ message:' OTP has been successfully sent, please check your phone. '});
    })
);

app.get(
    "/verify/otp/sms",
    rateLimiter,
    AuthControl,
    asyncHandler(async(req, res) => {
        var { EMailAddress, PhoneNumber, VerificationCode, Type } = req.body;

        var { error, value } = OTPVerifySchema.validate({ PhoneNumber: PhoneNumber, EMailAddress: EMailAddress, VerificationCode: VerificationCode, Type: Type}, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        var Auth = req.Auth;

        var verifiedVerification = await createVerificationCheck(PhoneNumber, VerificationCode);
        console.log("/verify/otp/sms : ", JSON.stringify(verifiedVerification));

        if(verifiedVerification.status != 'approved') return res.status(400).json({ message:' Verification failed, please try again.'});

        if( Type === "Login") {
            var update = {
                $set:{
                    TwoFAStatus: true
                }
            };
            await User.findByIdAndUpdate(Auth._id.toString(), update);
        }

        return res.status(200).json({ message:' OTP verification completed successfully, you can login.'});
    })
);

module.exports = app;