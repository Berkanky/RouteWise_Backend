const Joi = require("joi");

const AutoLoginSchema = Joi.object({
  RefreshToken: Joi.string().required().messages({
    "any.required": "Refresh token is required. ",
  }),
  DeviceId: Joi.string().optional()
});

module.exports = AutoLoginSchema;