const Joi = require("joi");

const RegisterTwoFASchema = Joi.object({
  VerificationId: Joi.string().max(6).required(),
});

module.exports = RegisterTwoFASchema;