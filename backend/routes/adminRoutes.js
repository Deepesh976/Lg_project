// routes/adminRoutes.js (diagnostic + safe)
const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const auth = require('../middlewares/auth');

// Defensive: show what we actually imported (helps debug)
if (process.env.NODE_ENV !== 'production') {
  console.log('Loaded adminController keys =>', adminController && Object.keys(adminController));
  console.log('Loaded auth keys =>', auth && Object.keys(auth));
}

// Pull handlers from controller (do NOT destructure blindly)
const createAdmin = adminController && adminController.createAdmin;
const loginAdmin = adminController && adminController.loginAdmin;
const getAdminProfile = adminController && adminController.getAdminProfile;
const forgotPassword = adminController && adminController.forgotPassword;
const resetPassword = adminController && adminController.resetPassword;
const protect = auth && auth.protect;

// Validate handlers are functions before registering routes
function assertFn(fn, name) {
  if (typeof fn !== 'function') {
    // throw a helpful error so server startup fails with a clear message
    throw new TypeError(`adminRoutes.js expected "${name}" to be a function but got: ${typeof fn}`);
  }
}

try {
  assertFn(createAdmin, 'createAdmin');
  assertFn(loginAdmin, 'loginAdmin');
  assertFn(getAdminProfile, 'getAdminProfile');
  assertFn(forgotPassword, 'forgotPassword');
  assertFn(resetPassword, 'resetPassword');
  assertFn(protect, 'protect');
} catch (err) {
  console.error('adminRoutes sanity check failed:', err && (err.message || err));
  throw err; // crash startup with clear message
}

// Public routes
router.post('/create', createAdmin);
router.post('/register', createAdmin);
router.post('/login', loginAdmin);

// Password reset (public)
router.post('/forgotPassword', forgotPassword);
router.post('/resetPassword', resetPassword);

// Protected route
router.get('/me', protect, getAdminProfile);

module.exports = router;
