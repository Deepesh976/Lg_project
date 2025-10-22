// routes/deviceRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const ctrl = require('../controllers/deviceController');

// small helper to wrap async route handlers and forward errors to express
const asyncWrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validate :id param early to avoid extra DB lookups or confusing errors
router.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid id parameter' });
  }
  next();
});

// Optional: basic request logging (remove or lower log level in production)
router.use((req, res, next) => {
  console.log(`[deviceRoutes] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes (note: analysis route kept before :id so it isn't treated as an id)
router.post('/', asyncWrap(ctrl.createDevice));
router.get('/', asyncWrap(ctrl.listDevices));
router.get('/analysis/summary', asyncWrap(ctrl.analysisSummary));
router.get('/:id', asyncWrap(ctrl.getDevice));
router.put('/:id', asyncWrap(ctrl.updateDevice));
router.delete('/:id', asyncWrap(ctrl.deleteDevice));

module.exports = router;
