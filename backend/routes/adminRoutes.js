const express = require('express');
const router = express.Router();
const { createAdmin, loginAdmin, getAdminProfile } = require('../controllers/adminController');
const { protect } = require('../middlewares/auth'); // <-- this path

router.post('/create', createAdmin);
router.post('/register', createAdmin);
router.post('/login', loginAdmin);
router.get('/me', protect, getAdminProfile);

module.exports = router;
