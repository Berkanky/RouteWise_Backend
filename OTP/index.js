require("dotenv").config();

const express = require("express");
const app = express.Router();

const twilio = require("twilio"); 
const rateLimiter = require("../Middleware/RateLimiter");
const asyncHandler = require("../Handler/Handler");

var accountSid = process.env.TWILIO_ACCOUNT_SI;
var authToken = process.env.TWILIO_AUTH_TOKEN;
var serviceSid = process.env.TWILIO_SERVICE_SID; //Eski.
var createdServiceSid = process.env.TWILIO_CREATED_SERVICE_SID;
var client = twilio(accountSid, authToken);

//Şemalar
const User = require("../Schemas/User");

//JOI Doğrulama şemaları
const OTPSendSchema = require("../JoiSchemas/OTPSendSchema");
const OTPVerifySchema = require("../JoiSchemas/OTPVerifySchema");

async function createVerification(PhoneNumber) {
    
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
      .services(serviceSid)
      .verificationChecks.create({
        code: VerificationCode,
        to: PhoneNumber,
      });
  
    console.log("createVerificationCheck : ", JSON.stringify(verificationCheck));
    return verificationCheck
};

app.get(
    "/send/otp/sms",
    rateLimiter,
    asyncHandler(async(req, res) => {
        var { EMailAddress, PhoneNumber } = req.body;

        var { error, value } = OTPSendSchema.validate({ PhoneNumber: PhoneNumber, EMailAddress: EMailAddress }, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        var createdVerification = await createVerification(PhoneNumber);

        console.log("/send/otp/sms : ", JSON.stringify(createdVerification));

        return res.status(201).json({ message:' OTP has been successfully sent, please check your phone. '});
    })
);

app.get(
    "/verify/otp/sms",
    rateLimiter,
    asyncHandler(async(req, res) => {
        var { EMailAddress, PhoneNumber, VerificationCode } = req.body;

        var { error, value } = OTPVerifySchema.validate({ PhoneNumber: PhoneNumber, EMailAddress: EMailAddress, VerificationCode: VerificationCode }, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        var verifiedVerification = await createVerificationCheck(PhoneNumber, VerificationCode);
        console.log("/verify/otp/sms : ", JSON.stringify(verifiedVerification));

        if(verifiedVerification.status != 'approved') return res.status(400).json({ message:' Verification failed, please try again.'});

        return res.status(200).json({ message:' OTP verification completed successfully, you can login.'});
    })
);


module.exports = app;