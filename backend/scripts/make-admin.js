
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
(async ()=>{
  await mongoose.connect(process.env.MONGO_URI);
  const email = 'mahimakothe01@gmail.com';
  const pass = await bcrypt.hash('Admin@1234', 10);
  await User.findOneAndUpdate({ email },
    { name:'Admin', email, password:pass, role:'admin' },
    { upsert:true, new:true });
  console.log('Admin ready');
  process.exit(0);
})();
