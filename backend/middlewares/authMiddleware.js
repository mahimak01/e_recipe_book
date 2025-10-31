const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  const token = h.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
