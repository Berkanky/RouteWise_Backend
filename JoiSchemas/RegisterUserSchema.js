const Joi = require("joi");

const RegisterUserSchema = Joi.object({
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
    }),

  UserName: Joi.string().alphanum().min(3).max(30).optional(),
  VerifySended: Joi.boolean().optional(),
  Verified: Joi.boolean().optional(),
  Name: Joi.string().max(50).required().messages({
    "any.required": "Name is required.",
  }),
  Surname: Joi.string().max(50).required().messages({
    "any.required": "Surname is required.",
  }),
  PhoneNumber: Joi.required().messages({
    "any.required": "Phone number is required. ",
  }),
  DialCode: Joi.required().messages({
    "any.required": "Dial code is required. ",
  }),
});

module.exports = RegisterUserSchema;
