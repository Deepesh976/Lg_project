// models/Analysis.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Flow point used in flowRate arrays.
 * We keep `time` as String because devices may send ISO strings or epoch numbers.
 */
const FlowPointSchema = new Schema(
  {
    time: { type: String, required: false },
    value: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * AnalysisSchema
 * - Designed to be flexible: handles UF and ATW fields
 * - Keeps meta/metadata for backward compatibility with legacy documents
 * - Includes explicit date/time/date_time fields requested
 */
const AnalysisSchema = new Schema(
  {
    // Canonical grouping key (preferred)
    setupId: { type: String, index: true, sparse: true },

    // legacy containers
    meta: { type: Schema.Types.Mixed, default: {} },
    metadata: { type: Schema.Types.Mixed, default: {} },

    // device / role
    role: { type: String, index: true }, // 'UF' or 'ATW'
    deviceLabel: { type: String }, // human-friendly label
    deviceId: { type: String, index: true }, // vendor device id
    machine_id: { type: String, index: true }, // alternate machine id key (some docs use this)
    uid: { type: String }, // user/card id (if present)

    /* ---------- UF fields ---------- */
    tds: { type: Number, default: null },
    pulseCount: { type: Number, default: null },
    flowRate: { type: [FlowPointSchema], default: [] }, // normalized array
    flowRateRaw: { type: Schema.Types.Mixed, default: null },

    /* ---------- ATW explicit fields ---------- */
    water_dispensed: { type: Number, default: null },
    rfid_collected_amount: { type: Number, default: null },
    rfid_swipe_count: { type: Number, default: null },
    amount_debited: { type: Number, default: null },
    coin_collected_amount: { type: Number, default: null },
    remaining_balance: { type: Number, default: null },
    user_card_activated: { type: Schema.Types.Mixed, default: null }, // can be boolean or string
    additional_status: { type: Schema.Types.Mixed, default: null },

    /* ---------- date/time fields (explicit) ---------- */
    date: { type: String, default: null }, // device-provided date (e.g. '2025-09-25')
    time: { type: String, default: null }, // device-provided time (e.g. '14:32:05')
    date_time: { type: String, default: null }, // combined date + time (string)

    /* timestamp fields (keep both - controller normalizes) */
    timestamp: { type: Date, default: null },
    recordedAt: { type: Date, default: null },

    /* allow other unknown fields from devices to be stored */
  },
  {
    strict: false, // keep extra fields sent by devices
    timestamps: true, // createdAt and updatedAt managed by mongoose
  }
);

/* Indexes commonly useful for queries */
AnalysisSchema.index({ setupId: 1, recordedAt: -1 });
AnalysisSchema.index({ 'metadata.setup_id': 1, recordedAt: -1 });
AnalysisSchema.index({ machine_id: 1, recordedAt: -1 });
AnalysisSchema.index({ deviceId: 1, recordedAt: -1 });

/**
 * Virtual: normalized keys
 * Access with doc.normalized.setupId / doc.normalized.machineId
 */
AnalysisSchema.virtual('normalized').get(function () {
  const meta = this.metadata || this.meta || {};
  const setupId = this.setupId || meta.setup_id || meta.setupId || null;
  const machineId =
    this.machine_id || this.deviceId || meta.machine_id || meta.device_id || null;

  // If date_time not present, attempt to build it from date + time (do not persist here)
  let dateTime = this.date_time || null;
  if (!dateTime) {
    const d = this.date || meta.date || null;
    const t = this.time || meta.time || null;
    if (d || t) dateTime = `${d ?? ''} ${t ?? ''}`.trim();
  }

  return { setupId, machineId, date_time: dateTime };
});

/* Ensure model reuse in watch/hot-reload environments */
const Analysis =
  mongoose.models.Analysis || mongoose.model('Analysis', AnalysisSchema);

/* Convenience bindings to collection names you use in controllers */
const AtwStats =
  mongoose.models.AtwStats ||
  mongoose.model('AtwStats', AnalysisSchema, 'atw_stats');
const UfStats =
  mongoose.models.UfStats || mongoose.model('UfStats', AnalysisSchema, 'uf_stats');

/* Export models */
module.exports = {
  Analysis,
  AtwStats,
  UfStats,
  Schema, // optional export in case controllers want to reuse Schema/FlowPoint
};
