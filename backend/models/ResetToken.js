const mongoose = require('mongoose');

const resetTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ResetToken', resetTokenSchema);
