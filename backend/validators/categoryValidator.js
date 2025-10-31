const Joi = require('joi');

function validateCategory(category) {
  const schema = Joi.object({
    name: Joi.string()
      .min(2)
      .max(30)
      .trim()
      .pattern(/^[A-Za-z0-9\s-]+$/) 
      .required()
      .messages({
        'string.pattern.base': 'Category can include letters, numbers, spaces, and hyphens only'
      })
  });
  return schema.validate(category);
}
module.exports = { validateCategory };
