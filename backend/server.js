// server.js
// Main backend server for RFID Project
// Uses Express, Mongoose, CORS, and Dotenv

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// ==== Route Imports ====
const deviceRoutes = require('./routes/deviceRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const rfidRoutes = require('./routes/rfidRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// ==== Environment Variables ====
const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rfid_db';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// ==== Middleware ====
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ==== API Routes ====
app.use('/api/devices', deviceRoutes);     // ✅ Devices section
app.use('/api/analysis', analysisRoutes);  // ✅ Device Analysis section
app.use('/api/rfid', rfidRoutes);          // ✅ RFID Card section
app.use('/api/users', userRoutes);         // ✅ USER Card section

// ==== Root & Health ====
app.get('/', (req, res) => res.send('✅ RFID API is running...'));
app.get('/health', (req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

// ==== 404 Handler ====
app.use((req, res) => res.status(404).json({ message: 'Route Not Found' }));

// ==== Global Error Handler ====
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ==== MongoDB Connection ====
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`🌐 CORS allowed from: ${CORS_ORIGIN}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

module.exports = app;
