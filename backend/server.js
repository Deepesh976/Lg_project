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
const proxyAtw = require('./routes/proxyAtw');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// ==== Environment Variables ====
const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// ==== Middleware ====
// Support comma-separated origins in CORS_ORIGIN env var
const allowedOrigins = CORS_ORIGIN.split(',').map(s => s.trim());
const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like curl, mobile apps or server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Simple request logger (helpful while debugging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ==== API Routes ====
app.use('/api/device', deviceRoutes);     // ✅ Devices section
app.use('/api/analysis', analysisRoutes);  // ✅ Device Analysis section
app.use('/api/rfid', rfidRoutes);          // ✅ RFID Card section
app.use('/api/proxy', proxyAtw);
app.use('/api/admin', adminRoutes);


// ==== Root & Health ====
app.get('/', (req, res) => res.send('✅ RFID API is running...'));
app.get('/health', (req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

// ==== 404 Handler ====
app.use((req, res) => res.status(404).json({ message: 'Route Not Found' }));

// ==== Global Error Handler ====
app.use((err, req, res, next) => {
  // handle CORS error nicely
  if (err && err.message && err.message.indexOf('CORS') !== -1) {
    console.warn('CORS error:', err.message);
    return res.status(403).json({ message: 'CORS error', detail: err.message });
  }
  console.error('💥 Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ==== MongoDB Connection ====
// Print mongoose queries in non-production for debugging
if (process.env.NODE_ENV !== 'production') {
  mongoose.set('debug', true);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`🌐 CORS allowed from: ${allowedOrigins.join(', ')}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

module.exports = app;