// routes/deviceRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const ctrl = require('../controllers/deviceController');
const { protect } = require('../middlewares/auth'); // require protect middleware

// async wrapper to forward errors to express error handler
const asyncWrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validate :id param early
router.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid id parameter' });
  }
  next();
});

// Optional logging in dev
if (process.env.NODE_ENV !== 'production') {
  router.use((req, res, next) => {
    console.log(`[deviceRoutes] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Protect all device routes (only authenticated admins can access)
router.use(protect);

// Routes
router.post('/', asyncWrap(ctrl.createDevice));
router.get('/', asyncWrap(ctrl.listDevices));
router.get('/analysis/summary', asyncWrap(ctrl.analysisSummary));
router.get('/:id', asyncWrap(ctrl.getDevice));
router.put('/:id', asyncWrap(ctrl.updateDevice));
router.delete('/:id', asyncWrap(ctrl.deleteDevice));

module.exports = router;
