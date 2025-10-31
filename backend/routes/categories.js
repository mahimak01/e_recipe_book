const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const { validateCategory } = require('../validators/categoryValidator');
const auth = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, isAdmin, async (req, res) => {
  const { error } = validateCategory(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const saved = await new Category({ name: req.body.name }).save();
    return res.status(201).json(saved);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Category already exists' });
    }
    return res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, isAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', auth, isAdmin, async (req, res) => {
  const { error } = validateCategory(req.body);
  if (error) return res.status(400).json({ errors: error.details.map(e => e.message) });

  try {
    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Category not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Category not found" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
