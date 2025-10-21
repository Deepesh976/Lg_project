const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  device_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  price_per_litre: {
    type: Number,
    required: true,
    default: 0
  },
  last_update: {
    type: Date,
    default: Date.now
  }
});

// Automatically update 'last_update' whenever a document is modified
DeviceSchema.pre('save', function (next) {
  this.last_update = Date.now();
  next();
});

module.exports = mongoose.model('Device', DeviceSchema);
