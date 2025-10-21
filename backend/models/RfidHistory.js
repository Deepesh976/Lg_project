// backend/models/RfidHistory.js
const mongoose = require('mongoose');

const RfidHistorySchema = new mongoose.Schema(
  {
    rfidId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rfid', required: true },
    cardSnapshot: {
      rfidSerial: { type: String, trim: true },
      rfidUhd: { type: String, trim: true },
      name: { type: String, trim: true },
      address: { type: String, trim: true },
      village: { type: String, trim: true },
      aadhar: { type: String, trim: true },
      mobile: { type: String, trim: true },
      members: { type: Number, default: 0 },
      qtyPerDay: { type: Number, default: 0 },
      qtyPerMonth: { type: Number, default: 0 },
      visitsPerMonth: { type: Number, default: 0 },
      qtyUsedMonth: { type: Number, default: 0 },
      remarks: { type: String, trim: true },
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Export with explicit collection name
module.exports = mongoose.model('RfidHistory', RfidHistorySchema, 'rfidhistories');
