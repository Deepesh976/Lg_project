// models/Device.js
const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema(
  {
    device_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    price_per_ltr: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    total_dispensed_litres: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
      default: 'ACTIVE',
    },
    last_update: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
    collection: 'devices', // ensures we use your friend's existing "devices" collection
  }
);

// Auto update `last_update` whenever saved or updated
DeviceSchema.pre('save', function (next) {
  this.last_update = Date.now();
  next();
});
DeviceSchema.pre('findOneAndUpdate', function (next) {
  this.set({ last_update: Date.now() });
  next();
});

// Create model safely without OverwriteModelError
const Device =
  mongoose.models.Device || mongoose.model('Device', DeviceSchema, 'devices');

module.exports = Device;
