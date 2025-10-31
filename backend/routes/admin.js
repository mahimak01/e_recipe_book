const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Recipe = require('../models/recipe');
const Category = require('../models/category');
const auth = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

router.use(auth, isAdmin);

/**
 * GET /api/admin/stats
 * KPIs: users, recipes, pending recipes, categories, total likes
 */
router.get('/stats', async (req, res) => {
  try {
    const [users, totalRecipes, pendingRecipes, categories, likesAgg] = await Promise.all([
      User.countDocuments(),
      Recipe.countDocuments({}),
      Recipe.countDocuments({ status: { $ne: 'approved' } }),
      Category.countDocuments(),
      Recipe.aggregate([{ $group: { _id: null, sum: { $sum: '$likes' } } }])
    ]);
    const likes = likesAgg?.[0]?.sum || 0;
    res.json({ users, recipes: totalRecipes, recipes_pending: pendingRecipes, categories, likes });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/**
 * GET /api/admin/users
 * Admin users listing
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('name email role createdAt');
    res.json({ total: users.length, users });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/**
 * GET /api/admin/top-liked
 * Top liked recipes (widget)
 */
router.get('/top-liked', async (req, res) => {
  try {
    const items = await Recipe.find({})
      .select('name likes category')
      .populate('category', 'name')
      .sort({ likes: -1 })
      .limit(10);
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
// GET /api/admin/analytics/users?period=daily|weekly|monthly|yearly&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/analytics/users', async (req, res) => {
  try {
    const { period = 'daily', from, to } = req.query;
    const tz = 'Asia/Kolkata';
    const now = new Date();

    function toISO(s) { return new Date(s); }
    function ymd(d){ const y=d.getFullYear(),m=(d.getMonth()+1+'').padStart(2,'0'),dd=(d.getDate()+'' ).padStart(2,'0'); return `${y}-${m}-${dd}`; }

    let start, end;
    if (from && to) {
      start = toISO(from + 'T00:00:00');
      end   = toISO(to   + 'T23:59:59');
    } else if (period === 'monthly') {
      const y = now.getFullYear();
      start = new Date(y, 0, 1, 0,0,0);
      end   = new Date(y, 11, 31, 23,59,59);
    } else if (period === 'yearly') {
      const y = now.getFullYear() - 4;
      start = new Date(y, 0, 1, 0,0,0);
      end   = new Date(now.getFullYear(), 11, 31, 23,59,59);
    } else {
      const s = new Date(now); s.setDate(now.getDate()-35); s.setHours(0,0,0,0);
      start = s; end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59);
    }

    const match = { createdAt: { $gte: start, $lte: end } };

    let pipeline;
    if (period === 'daily') {
      pipeline = [
        { $match: match },
        { $addFields: { dateLocal: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: tz } } } },
        { $group: { _id: "$dateLocal", count: { $sum: 1 } } },
        { $project: { _id: 0, date: "$_id", count: 1 } },
        { $sort: { date: 1 } }
      ];
    } else if (period === 'weekly') {
      pipeline = [
        { $match: match },
        { $addFields: { dow: { $isoDayOfWeek: { date: "$createdAt", timezone: tz } } } },
        { $addFields: {
            weekStart: {
              $dateToString: {
                format: "%Y-%m-%d",
                timezone: tz,
                date: { $dateSubtract: { startDate: "$createdAt", unit: "day", amount: { $subtract: [ "$dow", 1 ] } } }
              }
            }
        }},
        { $group: { _id: "$weekStart", count: { $sum: 1 } } },
        { $project: { _id: 0, date: "$_id", count: 1 } },
        { $sort: { date: 1 } }
      ];
    } else if (period === 'monthly') {
      pipeline = [
        { $match: match },
        { $addFields: { ym: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: tz } } } },
        { $group: { _id: "$ym", count: { $sum: 1 } } },
        { $project: { _id: 0, date: { $concat: [ "$_id", "-01" ] }, count: 1 } },
        { $sort: { date: 1 } }
      ];
    } else { // yearly
      pipeline = [
        { $match: match },
        { $addFields: { y: { $dateToString: { format: "%Y", date: "$createdAt", timezone: tz } } } },
        { $group: { _id: "$y", count: { $sum: 1 } } },
        { $project: { _id: 0, date: { $concat: [ "$_id", "-01-01" ] }, count: 1 } },
        { $sort: { date: 1 } }
      ];
    }

    const rows = await User.aggregate(pipeline);
    return res.json({ period, from: ymd(start), to: ymd(end), data: rows });
  } catch (e) {
    console.error('analytics/users error', e);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
