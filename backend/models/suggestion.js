const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  dish:    { type: String, required: true },
  name:    { type: String, required: true },
  email:   { type: String, required: true },
  comment: { type: String },
  status:  { type: String, enum: ['pending','approved','rejected'], default: 'pending', index: true },
adminReply: { type: String },
repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
repliedAt: { type: Date }

}, { timestamps: true });

module.exports = mongoose.model('Suggestion', suggestionSchema);
