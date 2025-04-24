const Joi = require("joi");

const LoginTwoFASchema = Joi.object({
  VerificationId: Joi.string().max(6).required(),
});

module.exports = LoginTwoFASchema;