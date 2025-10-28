// models/PasswordResetToken.js
const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  tokenHash: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// TTL index (Mongo will remove docs once expiresAt passes)
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordResetToken', TokenSchema);
