const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 3, maxlength: 100 },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum:['user','admin'], default:'user', index:true }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
