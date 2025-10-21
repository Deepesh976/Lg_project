const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  rfid_serial_no: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  rfid_uid: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  user_name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true
  },
  village: {
    type: String,
    required: true
  },
  aadhar_no: {
    type: Number,
    required: true,
    unique: true
  },
  mobile_no: {
    type: Number,
    required: true
  },
  family_mems: {
    type: Number,
    default: 1
  },
  quant_water_alloted_per_day: {
    type: Number,
    default: 0
  },
  quant_water_alloted_per_month: {
    type: Number,
    default: 0
  },
  swipe_count: {
    type: Number,
    default: 0
  },
  quant_water_used_in_month: {
    type: Number,
    default: 0
  },

  // ✅ New field added here
  allotment: {
    type: String,
    default: ''
  },

  remarks: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
