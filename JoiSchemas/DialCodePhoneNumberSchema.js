const Joi = require("joi");

const DialCodePhoneNumberSchema = Joi.object({
  PhoneNumber: Joi.required().messages({
    "any.required": "Phone number is required. ",
  }),
  DialCode: Joi.required().messages({
    "any.required": "Dial code is required. ",
  })
});

module.exports = DialCodePhoneNumberSchema;