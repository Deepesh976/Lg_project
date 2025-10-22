// models/Rfid.js
const mongoose = require('mongoose');

const RfidSchema = new mongoose.Schema(
  {
    // RFID info (optional during onboarding)
    rfid_serial_no: { type: String, required: true, trim: true, default: '' },
    rfid_uid: { type: String, required: true, trim: true, default: '' },

    // Personal info
    user_name: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    village: { type: String, default: '', trim: true },
    aadhar_no: { type: String, default: '', trim: true },
    mobile_no: { type: String, required: true, trim: true },

    // Allocation & usage
    family_mems: { type: Number, default: 1, min: 0 },
    quant_water_alloted_per_day: { type: Number, default: 0, min: 0 },
    quant_water_alloted_per_month: { type: Number, default: 0, min: 0 },
    swipe_count: { type: Number, default: 0, min: 0 },
    total_litres_consumed: { type: Number, default: 0, min: 0 },

    // Remaining card balance
    remaining_card_balance: { type: Number, default: 0, min: 0 },

    // Extras
    remarks: { type: String, default: '', trim: true }
  },
  { timestamps: true }
);

// Export model named "Rfid" and use collection "rfids"
module.exports = mongoose.models.Rfid || mongoose.model('Rfid', RfidSchema, 'rfids');
