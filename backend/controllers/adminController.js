const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'lg_secret_key';

/**
 * Create an admin manually (use once via Postman)
 * POST /api/admin/create
 */
exports.createAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Admin already exists' });

    const admin = new Admin({ email, password });
    await admin.save();

    res.status(201).json({ message: 'Admin created successfully' });
  } catch (err) {
    console.error('createAdmin error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Login admin
 * POST /api/admin/login
 */
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await admin.comparePassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error('loginAdmin error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Verify logged-in admin (for ProtectedRoutes)
 * GET /api/admin/me
 */
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json(admin);
  } catch (err) {
    console.error('getAdminProfile error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
