// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_jwt_secret_in_prod';

/**
 * protect - Express middleware to verify Bearer JWT in Authorization header
 * Sets req.user = payload if valid.
 */
exports.protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.slice(7).trim(); // remove 'Bearer '
    if (!token) return res.status(401).json({ message: 'Missing token' });

    const payload = jwt.verify(token, JWT_SECRET);
    // payload should contain { id, email, iat, exp } (depending on how you signed it)
    req.user = payload;
    return next();
  } catch (err) {
    console.error('auth.protect error:', err && err.message ? err.message : err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
