const Joi = require('joi');

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,128}$/; 
const noSpaceRegex = /^\S+$/;
const emailBasicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerSchema = Joi.object({
  name: Joi.string().min(3).max(100).trim().required(),
  email: Joi.string()
    .email({ tlds: { allow: false } }) 
    .pattern(emailBasicRegex, { name: 'basic-email' })
    .lowercase()
    .trim()
    .required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(noSpaceRegex, { name: 'no-spaces' })
    .pattern(passwordRegex, { name: 'strong-password' })
    .required()
    .messages({
      'string.pattern.name': 'Password must be 8-128 chars with upper, lower, digit, and symbol, and no spaces',
    }),
}).options({ abortEarly: false, allowUnknown: false, stripUnknown: true });

const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .pattern(emailBasicRegex, { name: 'basic-email' })
    .lowercase()
    .trim()
    .required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(noSpaceRegex, { name: 'no-spaces' })
    .required(),
}).options({ abortEarly: false, allowUnknown: false, stripUnknown: true });


const validate =
  (schema) =>
  (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ message: 'Validation error', details: error.details.map((d) => d.message) });
    }
    req.body = value;
    next();
  };

module.exports = {
  registerValidation: validate(registerSchema),
  loginValidation: validate(loginSchema),
};
