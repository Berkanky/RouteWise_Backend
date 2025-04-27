const Joi = require("joi");

const SetPasswordTwoFASchema = Joi.object({
  VerificationId: Joi.string().max(6).required(),
});

module.exports = SetPasswordTwoFASchema;