const Joi = require('joi');

const nameRule = Joi.string().pattern(/^[A-Za-z\s'-]{2,50}$/);
const timeRule = Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/);
const arrStr = Joi.array().items(Joi.string().min(2));
const stepsArr = Joi.array().items(Joi.string().min(5));
const imageUrlRule = Joi.string().uri();

function validateRecipe(recipe) {
  const schema = Joi.object({
    name: nameRule.required(),
    time: timeRule.required(),
    ingredients: arrStr.min(1).required(),
    steps: stepsArr.min(1).required(),
    imageUrl: imageUrlRule.optional(),
    requirement: arrStr.optional(),
    category: Joi.string().required()
  }).options({ abortEarly: false, stripUnknown: true });
  return schema.validate(recipe);
}

function validateRecipeUpdate(recipe) {
  const schema = Joi.object({
    name: nameRule.optional(),
    time: timeRule.optional(),
    ingredients: arrStr.optional(),
    steps: stepsArr.optional(),
    imageUrl: Joi.alternatives().try(imageUrlRule, Joi.valid(null, '')).optional(),
    requirement: arrStr.optional(),
    category: Joi.string().optional()
  }).options({ abortEarly: false, stripUnknown: true });
  return schema.validate(recipe);
}

module.exports = { validateRecipe, validateRecipeUpdate };
