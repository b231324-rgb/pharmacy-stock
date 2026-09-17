const mongoose = require('mongoose');

async function connectDatabase() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pharmacy_stock';
  await mongoose.connect(uri);
  return mongoose.connection;
}

module.exports = { connectDatabase };
