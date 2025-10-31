const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Recipe = require('../models/recipe');
const { validateRecipe, validateRecipeUpdate } = require('../validators/recipeValidator');
const { upload } = require('../config/cloudinary');
const auth = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');
const { getTransporter } = require('../utils/mailer');

const mapInStatus = (s) => s === 'denied' ? 'rejected' : s;
const mapOutStatus = (s) => s === 'rejected' ? 'denied' : s;

function parseArrayField(field) {
  if (field === undefined || field === null) return undefined;
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    if (field.trim() === '') return [];
    const src = field.includes('\n') ? field.split('\n') : field.split(',');
    return src.map(s => s.trim()).filter(Boolean);
  }
  return undefined;
}
const coerceBool = (v) => {
  if (typeof v === 'boolean') return v;
  if (v === '1' || v === 1) return true;
  if (v === '0' || v === 0) return false;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return undefined;
};

router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const imageUrl = req.file?.secure_url || req.body.imageUrl || undefined;

    const body = {
      name: req.body.name?.toString().trim(),
      time: req.body.time?.toString().trim(),
      like: false,
      category: req.body.category?.toString().trim(),
      status: (req.user?.role === 'admin')
        ? mapInStatus((req.body.status?.toString().trim()) || 'approved')
        : 'pending',
      banner: req.body.banner?.toString().trim(),
      cardImg: req.body.cardImg?.toString().trim(),
      ingredients: Array.isArray(req.body.ingredients) ? req.body.ingredients.map(s=>s.toString().trim()).filter(Boolean) : (parseArrayField(req.body.ingredients) ?? []),
      steps: Array.isArray(req.body.steps) ? req.body.steps.map(s=>s.toString().trim()).filter(Boolean) : (parseArrayField(req.body.steps) ?? []),
      requirement: Array.isArray(req.body.requirement) ? req.body.requirement.map(s=>s.toString().trim()).filter(Boolean) : (parseArrayField(req.body.requirement) ?? []),
      ...(imageUrl && { imageUrl })
    };

    // attach submitter from the logged-in user
    if (req.user) {
      body.createdBy = req.user._id;
      body.submitter = { userId: req.user._id, name: req.user.name, email: req.user.email };
      if (!body.submitterEmail) body.submitterEmail = req.user.email; // legacy field
    }

    const missing = [];
    if (!body.name) missing.push('name');
    if (!body.category) missing.push('category');
    if (!body.time) missing.push('time');
    if (!body.ingredients?.length) missing.push('ingredients');
    if (!body.steps?.length) missing.push('steps');
    if (missing.length) return res.status(400).json({ message: `Missing/invalid fields: ${missing.join(', ')}` });

    if (!mongoose.Types.ObjectId.isValid(body.category)) {
      return res.status(400).json({ message: 'Invalid category id' });
    }

    const { error } = validateRecipe(body);
    if (error) return res.status(400).json({ errors: error.details.map(e => e.message) });

    const saved = await Recipe.create(body);
    const obj = saved.toObject();
    obj.status = mapOutStatus(obj.status);
    return res.status(201).json({ message: 'Recipe submitted for review', saved: obj });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', auth, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const patch = {};
    if (req.body.name !== undefined) patch.name = req.body.name;
    if (req.body.time !== undefined) patch.time = req.body.time;
    if (req.body.like !== undefined) patch.like = coerceBool(req.body.like);
    if (req.body.category !== undefined) patch.category = req.body.category;
    if (req.body.status !== undefined) patch.status = mapInStatus(req.body.status);
    if (req.body.banner !== undefined) patch.banner = req.body.banner;
    if (req.body.cardImg !== undefined) patch.cardImg = req.body.cardImg;

    const ing = parseArrayField(req.body.ingredients);
    if (ing !== undefined) patch.ingredients = ing;
    const steps = parseArrayField(req.body.steps);
    if (steps !== undefined) patch.steps = steps;
    const reqs = parseArrayField(req.body.requirement);
    if (reqs !== undefined) patch.requirement = reqs;

    const imageUrl = req.file?.secure_url || req.file?.path || undefined;
    if (imageUrl) patch.imageUrl = imageUrl;

    const { error } = validateRecipeUpdate(patch);
    if (error) return res.status(400).json({ errors: error.details.map(e => e.message) });

    const updated = await Recipe.findByIdAndUpdate(
      req.params.id,
      { $set: patch },
      { new: true, runValidators: true, context: 'query' }
    ).populate('category');
    if (!updated) return res.status(404).json({ message: 'Recipe not found' });

    const obj = updated.toObject();
    obj.status = mapOutStatus(obj.status);
    return res.json({ message: 'Recipe updated successfully', updated: obj });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate('category');
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
    const obj = recipe.toObject();
    obj.status = mapOutStatus(obj.status);
    return res.json(obj);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const deleted = await Recipe.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Recipe not found' });
    return res.json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { categoryId, search, status } = req.query;
    const filter = {};
    if (categoryId) filter.category = categoryId;
    if (status) filter.status = mapInStatus(status);
    if (search) filter.name = { $regex: search, $options: 'i' };
    const recipes = await Recipe.find(filter).populate('category');

    const out = recipes.map(r => {
      const o = r.toObject();
      o.status = mapOutStatus(o.status);
      o.submitterRole = (o.submitter?.userId && String(o.createdBy) === String(o.submitter.userId)) ? 'user' : 'admin';
      return o;
    });
    return res.json({ total: out.length, recipes: out });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/:id/likes', async (req, res) => {
  const r = await Recipe.findById(req.params.id).select('likes likedByClients');
  if (!r) return res.status(404).json({ message: 'Recipe not found' });
  const liked = req.query.clientId ? (r.likedByClients || []).includes(String(req.query.clientId)) : false;
  res.json({ likes: r.likes || 0, liked });
});

router.post('/:id/like', async (req, res) => {
  const { clientId } = req.body || {};
  if (!clientId) return res.status(400).json({ message: 'clientId required' });
  const r = await Recipe.findById(req.params.id);
  if (!r) return res.status(404).json({ message: 'Recipe not found' });
  r.likedByClients = Array.isArray(r.likedByClients) ? r.likedByClients : [];
  if (!r.likedByClients.includes(String(clientId))) {
    r.likedByClients.push(String(clientId));
    r.likes = (r.likes || 0) + 1;
    await r.save();
  }
  res.json({ likes: r.likes || 0, liked: true });
});

router.post('/:id/unlike', async (req, res) => {
  const { clientId } = req.body || {};
  if (!clientId) return res.status(400).json({ message: 'clientId required' });
  const r = await Recipe.findById(req.params.id);
  if (!r) return res.status(404).json({ message: 'Recipe not found' });
  const before = (r.likedByClients || []).length;
  r.likedByClients = (r.likedByClients || []).filter(c => c !== String(clientId));
  if ((r.likedByClients || []).length !== before) {
    r.likes = Math.max((r.likes || 0) - 1, 0);
    await r.save();
  }
  res.json({ likes: r.likes || 0, liked: false });
});

router.post('/:id/reply', auth, isAdmin, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).select('name submitter submitterEmail');
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    const to = (recipe.submitter && recipe.submitter.email) || recipe.submitterEmail;
    if (!to) return res.status(400).json({ message: 'No submitter email found for this recipe' });

    const text = String(req.body?.reply || '').trim();
    if (!text) return res.status(400).json({ message: 'Reply text is required' });

    const transporter = await getTransporter();
    const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
    const subject = `Regarding your recipe: ${recipe.name || 'submission'}`;

    await transporter.sendMail({ from, to, subject, text });

    recipe.adminReply = text;
    recipe.repliedBy = req.user._id;
    recipe.repliedAt = new Date();
    await recipe.save();

    return res.json({ message: 'Reply sent to submitter' });
  } catch (err) {
    console.error('recipe reply error:', err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
