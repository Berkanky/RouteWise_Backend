const Joi = require("joi");

const SetPasswordUserSchema = Joi.object({
  EMailAddress: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address.",
      "any.required": "Email address required.",
    }),

  Password: Joi.string()
    .min(8)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])"))
    .required()
    .messages({
      "string.min": "The password must be at least 8 characters.",
      "string.pattern.base":
        "The password must contain at least one uppercase letter, one lowercase letter and one number.",
      "any.required": "The password is required.",
    }),

  PasswordConfirm: Joi.any() 
    .equal(Joi.ref("Password")) 
    .required()
    .messages({
      "any.only": "Passwords do not match.",
      "any.required": "Password confirmation is required."
    })
});

module.exports = SetPasswordUserSchema;