const Joi = require("joi");

const OTPVerifySchema = Joi.object({
  EMailAddress: Joi.string().required().messages({
    "any.required": "Email address is required. ",
  }),
  PhoneNumber: Joi.required().messages({
    "any.required": "Phone number is required. ",
  }),
  VerificationCode: Joi.string().required().messages({
    "any.required": "Verification code is required. ",
  }),
  DialCode: Joi.required().messages({
    "any.required": "Dial code is required. ",
  }),
  Type: Joi.string().required().messages({
    "any.required": "Type is required. ",
  }),
});

module.exports = OTPVerifySchema;