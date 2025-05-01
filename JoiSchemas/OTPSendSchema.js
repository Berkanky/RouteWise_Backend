const Joi = require("joi");

const OTPSendSchema = Joi.object({
  EMailAddress: Joi.string().required().messages({
    "any.required": "Email address is required. ",
  }),
  PhoneNumber: Joi.string().required().messages({
    "any.required": "Phone number is required. ",
  }),
  DialCode: Joi.string().required().messages({
    "any.required": "Dial code is required. ",
  })
});

module.exports = OTPSendSchema;