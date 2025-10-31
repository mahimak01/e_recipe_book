require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Routers
const authRouter = require('./routes/auth');
const recipeRouter = require('./routes/recipes');
const categoryRouter = require('./routes/categories');
const adminRouter = require('./routes/admin');
const suggestionRouter = require('./routes/suggestions');

app.use('/api/auth', authRouter);
app.use('/api/recipes', recipeRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/admin', adminRouter);
app.use('/api/suggestions', suggestionRouter);

app.get('/', (req, res) => res.send('E-Recipe API running '));

// Not found
app.all(/^\/api\/.*/, (req, res) => res.status(404).json({ message: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: err.message || 'Server error' });
});

// DB + start
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/RecipeBook');
mongoose.connection.on('open', () => console.log('MongoDB connected'));
mongoose.connection.on('error', err => console.error('MongoDB error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
