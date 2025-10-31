const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  time: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved', index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  ingredients: [{ type: String, required: true }],
  steps: [{ type: String, required: true }],
  requirement: [{ type: String }],
  imageUrl: { type: String },
  banner: { type: String },
  cardImg: { type: String },
  likes: { type: Number, default: 0, index: true },
  likedByClients: [{ type: String, index: true }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submitter: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String },
    email: { type: String }
  },
  submitterEmail: { type: String },
  adminReply: { type: String },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  repliedAt: { type: Date }
},
  { timestamps: true });

module.exports = mongoose.model('Recipe', recipeSchema);
