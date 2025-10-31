const User = require('../models/User');
const ResetToken = require('../models/ResetToken');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getTransporter } = require('../utils/mailer');

const APP_URL = process.env.APP_URL || 'http://localhost:5500';
const RESET_TOKEN_TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MIN || 60);
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normEmail = (email || '').toLowerCase().trim();
    if (!name || !normEmail || !password) {
      return res.status(400).json({ message: 'name, email, password are required' });
    }
    if (await User.findOne({ email: normEmail }))
      return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await new User({ name, email: normEmail, password: hashed }).save();
    const { password: _omit, ...safeUser } = user.toObject();
    res.status(201).json({ message: 'User registered successfully', user: safeUser });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normEmail = (email || '').toLowerCase().trim();
    if (!normEmail || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: normEmail });
    if (!user) return res.status(401).json({ message: 'Invalid Email' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid Passsword' });

    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '2h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { _id:user._id, name:user.name, email:user.email, role:user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const normEmail = (req.body.email || '').toLowerCase().trim();
    if (!normEmail) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: normEmail });
    if (!user) return res.json({ message: 'If the email exists, a reset link was sent.' });

    await ResetToken.deleteMany({ userId: user._id });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000);
    await ResetToken.create({ userId: user._id, tokenHash, expiresAt });

    const resetLink = `${APP_URL}/reset.html?token=${encodeURIComponent(rawToken)}`;

    const BRAND_NAME = process.env.BRAND_NAME || 'RecipeBook';
    const LOGO_URL = process.env.LOGO_URL || '';
    const PRIMARY_COLOR = process.env.PRIMARY_COLOR || '#3b6bd3ff';

    const subject = 'Reset your password';
    const text = `A password reset was requested for your account.

Click this link to set a new password (valid for ${RESET_TOKEN_TTL_MIN} minutes):
${resetLink}

If this wasn't requested, you can ignore this email.`;

    const domainLabel = APP_URL.replace(/^https?:\/\//, '');
    const html = `<!doctype html><html><head>
<meta name="x-apple-disable-message-reformatting">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<title>Password reset</title>
<style>
body { margin:0 auto; padding:0; background:#f5f7fb; -webkit-text-size-adjust:100%; }
.wrap { width:100%; padding:24px 0; }
.card { max-width:560px; margin:0 auto; background:#ffffff; text-align:center ;border-radius:12px; padding:28px; font-family:Segoe UI, Roboto, Arial, sans-serif; color:#1f2937; }
.brand { text-align:center; margin:4px 0 18px; }
.brand img { max-width:120px; height:auto; display:inline-block; }
h1 { font-size:22px; margin:0 0 8px; color:#111827; text-align:center; }
p { font-size:14px; line-height:1.6; margin:0 0 14px; }
.btn-wrap { text-align:center; margin:22px 0; }
.btn { display:inline-block; background:${PRIMARY_COLOR}; color:#ffffff !important; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600; }
.muted { color:#6b7280; font-size:12px; }
.footer { text-align:center; margin-top:18px; color:#9ca3af; font-size:12px; }
@media only screen and (max-width: 600px) { .card{ margin:0 12px; padding:20px; } }
</style>
</head><body><div class="wrap"><div class="card">
${LOGO_URL ? `<div class="brand"><img src="${LOGO_URL}" alt="${BRAND_NAME} logo" width="120" /></div>` : ''}
<h1>Reset your password</h1>
<p>A password reset was requested for your account.</p>
<div class="btn-wrap"><a class="btn" href="${resetLink}" target="_blank" rel="noopener">Reset Password</a></div>
<p class="muted">This link is valid for ${RESET_TOKEN_TTL_MIN} minutes and can be used once.</p>
<p class="muted">If this wasn’t requested, simply ignore this email.</p>
<div class="footer">${BRAND_NAME} • ${domainLabel}</div>
</div></div></body></html>`;

    const transporter = await getTransporter();
    const gmailUser = process.env.SMTP_USER;
    const fromEmail = process.env.FROM_EMAIL || process.env.SENDER_EMAIL || gmailUser;
    const from = `"${BRAND_NAME}" <${fromEmail}>`;

    await transporter.sendMail({ from, to: user.email, subject, text, html });

    return res.json({ message: 'If the email exists, a reset link was sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    const tokenHash = hashToken(token);
    const tokenDoc = await ResetToken.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
    if (!tokenDoc) return res.status(400).json({ message: 'Invalid or expired token' });

    const user = await User.findById(tokenDoc.userId);
    if (!user) return res.status(400).json({ message: 'User not found' });

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    await ResetToken.deleteOne({ _id: tokenDoc._id });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
