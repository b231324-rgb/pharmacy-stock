require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const medicineRoutes = require('./routes/medicines');
const alertRoutes = require('./routes/alerts');
const searchRoutes = require('./routes/search');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/search', searchRoutes);
app.use((error, _req, res, _next) => {
  const status = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
  res.status(status).json({ error: error.message || 'internal server error' });
});
module.exports = app;
