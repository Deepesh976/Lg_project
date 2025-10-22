// models/Analysis.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * AnalysisSchema
 * - Handles only ATW-related fields now.
 * - Retains meta/metadata for backward compatibility with older documents.
 */
const AnalysisSchema = new Schema(
  {
    // Grouping key (preferred)
    setupId: { type: String, index: true, sparse: true },

    // Metadata containers (legacy support)
    meta: { type: Schema.Types.Mixed, default: {} },
    metadata: { type: Schema.Types.Mixed, default: {} },

    // Device information
    role: { type: String, index: true }, // 'ATW'
    deviceLabel: { type: String },
    deviceId: { type: String, index: true },
    machine_id: { type: String, index: true },
    uid: { type: String }, // user/card id (if present)

    /* ---------- ATW explicit fields ---------- */
    water_dispensed: { type: Number, default: null },
    rfid_collected_amount: { type: Number, default: null },
    rfid_swipe_count: { type: Number, default: null },
    amount_debited: { type: Number, default: null },
    coin_collected_amount: { type: Number, default: null },
    remaining_balance: { type: Number, default: null },
    user_card_activated: { type: Schema.Types.Mixed, default: null }, // boolean/string
    additional_status: { type: Schema.Types.Mixed, default: null },

    /* ---------- Date/time fields ---------- */
    date: { type: String, default: null },       // e.g. '2025-09-25'
    time: { type: String, default: null },       // e.g. '14:32:05'
    date_time: { type: String, default: null },  // combined date + time

    /* ---------- Timestamps ---------- */
    timestamp: { type: Date, default: null },
    recordedAt: { type: Date, default: null },

    /* ---------- Flexibility ---------- */
  },
  {
    strict: false, // keep extra fields
    timestamps: true, // adds createdAt, updatedAt
  }
);

/* ---------- Indexes ---------- */
AnalysisSchema.index({ setupId: 1, recordedAt: -1 });
AnalysisSchema.index({ 'metadata.setup_id': 1, recordedAt: -1 });
AnalysisSchema.index({ machine_id: 1, recordedAt: -1 });
AnalysisSchema.index({ deviceId: 1, recordedAt: -1 });

/* ---------- Virtuals ---------- */
AnalysisSchema.virtual('normalized').get(function () {
  const meta = this.metadata || this.meta || {};
  const setupId = this.setupId || meta.setup_id || meta.setupId || null;
  const machineId =
    this.machine_id || this.deviceId || meta.machine_id || meta.device_id || null;

  let dateTime = this.date_time || null;
  if (!dateTime) {
    const d = this.date || meta.date || null;
    const t = this.time || meta.time || null;
    if (d || t) dateTime = `${d ?? ''} ${t ?? ''}`.trim();
  }

  return { setupId, machineId, date_time: dateTime };
});

/* ---------- Models ---------- */
const Analysis =
  mongoose.models.Analysis || mongoose.model('Analysis', AnalysisSchema);

const AtwStats =
  mongoose.models.AtwStats ||
  mongoose.model('AtwStats', AnalysisSchema, 'atw_stats');

/* ---------- Export ---------- */
module.exports = {
  Analysis,
  AtwStats,
  Schema,
};
