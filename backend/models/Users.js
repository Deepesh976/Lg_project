// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  
  rfid_serial_no: { type: String, trim: true, default: '' },
  rfid_uid: { type: String, trim: true, default: null, index: { unique: true, sparse: true } },

  user_name: { type: String, required: true, trim: true },
  address: { type: String, default: '', trim: true },
  village: { type: String, default: '', trim: true },

  // use string for aadhar to preserve leading zeros if any
  aadhar_no: { type: String, default: '', trim: true, unique: false },

  // mobile as string is safer (leading zeros / long numbers)
  mobile_no: { type: String, required: true, trim: true },

  family_mems: { type: Number, default: 1 },
  quant_water_alloted_per_day: { type: Number, default: 0 },
  quant_water_alloted_per_month: { type: Number, default: 0 },

  // number of times water taken in the month
  swipe_count: { type: Number, default: 0 },

  // extra fields
  allotment: { type: String, default: '' },
  remarks: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
