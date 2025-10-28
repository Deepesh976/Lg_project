// controllers/adminController.js
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PasswordResetToken = require('../models/PasswordResetToken');
const Admin = require('../models/Admin');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_in_env';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// configure transporter using env vars
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// optional verify in non-production (safe)
if (process.env.NODE_ENV !== 'production') {
  transporter.verify()
    .then(() => console.log('SMTP transporter verified — ready to send emails'))
    .catch(err => {
      console.warn('SMTP transporter verify failed (dev). Emails may not send. Error:', err && (err.message || err));
    });
}

/**
 * createAdmin - Register / create an admin
 */
async function createAdmin(req, res) {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const admin = new Admin({
      email: email.toLowerCase().trim(),
      password,
      name: name || ''
    });

    await admin.save();

    return res.status(201).json({ success: true, message: 'Admin created', adminId: admin._id });
  } catch (err) {
    console.error('createAdmin error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * loginAdmin - authenticate admin, return JWT
 */
async function loginAdmin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = typeof admin.comparePassword === 'function'
      ? await admin.comparePassword(password)
      : await bcrypt.compare(password, admin.password || '');

    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const payload = { id: admin._id, email: admin.email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({ success: true, token, admin: { id: admin._id, email: admin.email, name: admin.name || '' } });
  } catch (err) {
    console.error('loginAdmin error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * getAdminProfile - protected route; returns profile
 */
async function getAdminProfile(req, res) {
  try {
    const id = (req.user && (req.user.id || req.user._id)) || (req.admin && req.admin.id) || req.userId;
    if (!id) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const admin = await Admin.findById(id).select('-password');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    return res.json({ success: true, admin });
  } catch (err) {
    console.error('getAdminProfile error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * forgotPassword - sends a reset link to the email, stores hashed token in DB
 * Expects: { email }
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    console.log('forgotPassword: request email=', email);
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    const genericResponse = { success: true, message: 'If that email exists you will receive a reset link shortly.' };

    if (!admin) {
      console.log(`forgotPassword: no admin found for email=${email}`);
      return res.json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    try {
      await PasswordResetToken.deleteMany({ userId: admin._id });
      const created = await PasswordResetToken.create({ userId: admin._id, tokenHash, expiresAt });
      console.log('forgotPassword: token saved:', created._id.toString());
    } catch (dbErr) {
      console.error('forgotPassword: DB error saving token:', dbErr);
      return res.status(500).json({ success: false, message: 'Server error saving reset token' });
    }

    // DEV: log raw token so you can test reset endpoint without email. REMOVE in prod.
    console.log('DEV raw reset token (for testing only):', rawToken);

    // Build reset URL
    const resetUrl = `${FRONTEND_URL}/resetPassword?token=${rawToken}&email=${encodeURIComponent(admin.email)}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'no-reply@example.com',
      to: admin.email,
      subject: 'Password reset instructions',
      text: `You requested a password reset. Use this link to reset your password: ${resetUrl}\nIf you didn't request this, ignore this email.`,
      html: `<p>Password Reset Link. <a href="${resetUrl}">Click here to reset your password</a>.</p>`
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('forgotPassword: email send info =', info && (info.messageId || info.response || info));
    } catch (mailErr) {
      console.error('forgotPassword: sendMail error:', mailErr && (mailErr.response || mailErr.message || mailErr));
      // If mail fails, still return generic response so consumers cannot enumerate.
      return res.status(500).json({ success: false, message: 'Failed to send reset email. Please try again later.' });
    }

    return res.json(genericResponse);
  } catch (err) {
    console.error('forgotPassword: unexpected error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * resetPassword - validates token hash and updates password
 * Expects: { token, email, newPassword }
 */
async function resetPassword(req, res) {
  try {
    const { token, email, newPassword } = req.body;
    if (!token || !email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) return res.status(400).json({ success: false, message: 'Invalid token or user' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const dbToken = await PasswordResetToken.findOne({ userId: admin._id, tokenHash });

    if (!dbToken) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    if (new Date() > dbToken.expiresAt) {
      try { await PasswordResetToken.deleteOne({ _id: dbToken._id }); } catch(e) { /* ignore */ }
      return res.status(400).json({ success: false, message: 'Token expired' });
    }

    // Set plain password (pre-save hook in Admin model will hash)
    admin.password = newPassword;
    await admin.save();

    // Clean up tokens
    try { await PasswordResetToken.deleteMany({ userId: admin._id }); } catch(e) { /* ignore */ }

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('resetPassword error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  createAdmin,
  loginAdmin,
  getAdminProfile,
  forgotPassword,
  resetPassword
};
