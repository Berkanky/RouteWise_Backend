const Joi = require("joi");

const OTPVerifySchema = Joi.object({
  EMailAddress: Joi.string().required().messages({
    "any.required": "Email address is required. ",
  }),
  PhoneNumber: Joi.string().required().messages({
    "any.required": "Phone number is required. ",
  }),
  VerificationCode: Joi.string().required().messages({
    "any.required": "Verification code is required. ",
  }),
});

module.exports = OTPVerifySchema;