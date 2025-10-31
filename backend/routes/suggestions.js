const express = require('express');
const router = express.Router();
const Suggestion = require('../models/suggestion');
const auth = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');
const { getTransporter } = require('../utils/mailer');

router.post('/', async (req,res)=>{
  try{
    const { dish, name, email, comment } = req.body;
    if (!dish || !name || !email) return res.status(400).json({ message:'dish, name, email required' });
    const saved = await Suggestion.create({ dish, name, email, comment });
    res.status(201).json({ message:'Suggestion submitted', saved });
  }catch(err){
    console.error('Suggestion create error:', err);
    res.status(500).json({ message:'Server error' });
  }
});
router.post('/:id/reply', auth, isAdmin, async (req, res) => {
  const { reply } = req.body || {};
  if (!reply || !reply.trim()) return res.status(400).json({ message: 'Reply is required' });
  const s = await Suggestion.findById(req.params.id);
  if (!s) return res.status(404).json({ message: 'Suggestion not found' });

  s.adminReply = reply.trim();
  s.repliedBy = req.user._id;
  s.repliedAt = new Date();
  await s.save();

  try {
    if (s.email) {
      const t = await getTransporter();
      await t.sendMail({
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: s.email,
        subject: `Reply to your suggestion: ${s.dish || 'Recipe'}`,
        text: reply.trim()
      });
    }
  } catch {}

  res.json({ message: 'Reply sent', item: s });
});

router.get('/', auth, isAdmin, async (req,res)=>{
  try{
    const { status } = req.query;
    const filter = status ? { status } : {};
    const items = await Suggestion.find(filter).sort({ createdAt:-1 });
    res.json({ total: items.length, items });
  }catch(err){
    console.error('Suggestion list error:', err);
    res.status(500).json({ message:'Server error' });
  }
});

router.patch('/:id/status', auth, isAdmin, async (req,res)=>{
  try{
    const { status } = req.body;
    if (!['pending','approved','rejected'].includes(status))
      return res.status(400).json({ message:'Invalid status' });
    const updated = await Suggestion.findByIdAndUpdate(req.params.id, { status }, { new:true });
    if (!updated) return res.status(404).json({ message:'Not found' });
    res.json({ message:'Updated', updated });
  }catch(err){
    console.error('Suggestion update error:', err);
    res.status(500).json({ message:'Server error' });
  }
});

router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const deleted = await Suggestion.findByIdAndDelete(req.params.id); 
    if (!deleted) return res.status(404).json({ message: 'Not found' }); 
    return res.status(204).end();
  } catch (err) {
    console.error('Suggestion delete error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
