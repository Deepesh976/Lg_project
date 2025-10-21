// controllers/analysisController.js
const mongoose = require('mongoose');
const axios = require('axios');
const { Analysis, AtwStats, UfStats } = require('../models/Analysis'); // adjust if your model exports differ

// External stats service (hard-coded per your provided info)
// You can change this to an env var if needed: process.env.EXTERNAL_STATS_BASE
const EXTERNAL_STATS_BASE = 'http://192.168.0.207:2222';
const EXTERNAL_STATS_FETCH_PATH = '/api/stats/fetch';

//////////////////////////////////////////////////////////////////////
// Helpers
//////////////////////////////////////////////////////////////////////

/**
 * pickField(doc, keys[], fallback)
 * Tries top-level doc props, then doc.metadata, then doc.meta, and camel-cased variants.
 */
const pickField = (doc = {}, keys = [], fallback = null) => {
  if (!doc || typeof doc !== 'object') return fallback;
  const meta = (doc.metadata && typeof doc.metadata === 'object') ? doc.metadata : (doc.meta && typeof doc.meta === 'object' ? doc.meta : {});
  for (const k of keys) {
    if (!k) continue;
    // direct on doc
    if (Object.prototype.hasOwnProperty.call(doc, k) && doc[k] !== undefined && doc[k] !== null) return doc[k];
    // direct on meta
    if (Object.prototype.hasOwnProperty.call(meta, k) && meta[k] !== undefined && meta[k] !== null) return meta[k];
    // camelCase variant
    if (typeof k === 'string') {
      const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (Object.prototype.hasOwnProperty.call(doc, camel) && doc[camel] !== undefined && doc[camel] !== null) return doc[camel];
      if (Object.prototype.hasOwnProperty.call(meta, camel) && meta[camel] !== undefined && meta[camel] !== null) return meta[camel];
    }
  }
  return fallback;
};

/**
 * normalizeFlowRate(doc)
 * Normalize different shapes (array, number, single-object) into array of { time, value }.
 */
const normalizeFlowRate = (doc = {}) => {
  const meta = doc.metadata || doc.meta || {};
  const candidates = [
    doc.flowRate,
    doc.flow_rate,
    meta.flowRate,
    meta.flow_rate,
    doc.flowRateRaw,
    doc.flowrate,
    doc.flow_rate_raw,
    doc.uf_data && (doc.uf_data.flow_rate ?? doc.uf_data.flowRate),
  ];

  for (const raw of candidates) {
    if (raw == null) continue;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((p) => {
        if (p == null) return { time: '', value: 0 };
        if (typeof p === 'number') return { time: '', value: p };
        const time = p.time ?? p.t ?? p.ts ?? p.timestamp ?? '';
        const value = p.value ?? p.v ?? p.val ?? p.flow ?? 0;
        return { time: String(time), value: Number(value) || 0 };
      });
    }
    if (typeof raw === 'number') {
      return [{ time: meta.time || doc.time || '', value: raw }];
    }
    if (typeof raw === 'object' && (raw.value || raw.v || raw.val || raw.flow || raw.flow_rate)) {
      const val = raw.value ?? raw.v ?? raw.val ?? raw.flow ?? raw.flow_rate;
      const time = raw.time ?? raw.t ?? raw.ts ?? meta.time ?? doc.time ?? '';
      return [{ time: String(time), value: Number(val) || 0 }];
    }
  }

  return [];
};

/**
 * normalizeDocToMetrics(doc)
 * Convert a raw document (from Mongo or external API) to canonical metrics used by frontend:
 * {
 *   tds, pulseCount, flowRate (array), recordedAt,
 *   setup_id, machine_id, status, water_dispensed, rfid_collected_amount,
 *   rfid_swipe_count, amount_debited, uid, coin_collected_amount, remaining_balance,
 *   user_card_activated, date_time, additional_status, last_seen
 * }
 */
const normalizeDocToMetrics = (doc) => {
  if (!doc) {
    return {
      tds: null,
      pulseCount: null,
      flowRate: [],
      recordedAt: null,
      setup_id: null,
      machine_id: null,
      status: null,
      water_dispensed: null,
      rfid_collected_amount: null,
      rfid_swipe_count: null,
      amount_debited: null,
      uid: null,
      coin_collected_amount: null,
      remaining_balance: null,
      user_card_activated: null,
      date_time: null,
      additional_status: null,
      last_seen: null,
    };
  }

  // accomodate nested uf_data from external API
  const docMerged = Object.assign({}, doc, doc.uf_data || {}, { metadata: doc.metadata || doc.meta || {} });

  // UF: tds, pulseCount, flowRate
  const tdsRaw = pickField(docMerged, ['tds', 'TDS', 'uf_data.tds', 'metadata.tds'], null);
  const tds = (tdsRaw === null || tdsRaw === undefined) ? null : Number(tdsRaw);

  const pulseRaw = pickField(docMerged, ['pulseCount', 'pulse_count', 'pulses', 'uf_data.pulse_count', 'uf_data.pulseCount'], null);
  const pulseCount = (pulseRaw === null || pulseRaw === undefined) ? null : Number(pulseRaw);

  const flowRate = normalizeFlowRate(docMerged);

  // recordedAt: prefer recordedAt, timestamp, ts
  const recordedAtRaw = pickField(docMerged, ['recordedAt', 'recorded_at', 'timestamp', 'ts', 'time', 'last_seen', 'date_time'], null);
  const recordedAt = (recordedAtRaw === null || recordedAtRaw === undefined) ? null : (() => {
    const d = new Date(recordedAtRaw);
    return isNaN(d) ? String(recordedAtRaw) : d.toISOString();
  })();

  // ATW fields
  const setup_id = pickField(docMerged, ['_id.setup_id', 'setup_id', 'setupId', 'setup', 'metadata.setup_id', 'meta.setup_id'], null);
  const machine_id = pickField(docMerged, ['_id.machine_id', 'machine_id', 'deviceId', 'device_id', 'deviceLabel', '_id'], null);
  const status = pickField(docMerged, ['status', 'state', 'additional_status'], null);

  const water_dispensed_raw = pickField(docMerged, ['water_dispensed', 'waterDispensed', 'water_dispense', 'water'], null);
  const water_dispensed = (water_dispensed_raw === null || water_dispensed_raw === undefined) ? null : Number(water_dispensed_raw);

  const rfid_collected_amount_raw = pickField(docMerged, ['rfid_collected_amount', 'rfidCollectedAmount', 'rfid_amount', 'rfidAmount', 'rfid'], null);
  const rfid_collected_amount = (rfid_collected_amount_raw === null || rfid_collected_amount_raw === undefined) ? null : Number(rfid_collected_amount_raw);

  const rfid_swipe_count_raw = pickField(docMerged, ['rfid_swipe_count', 'rfidSwipeCount', 'swipeCount', 'rfid_swipes'], null);
  const rfid_swipe_count = (rfid_swipe_count_raw === null || rfid_swipe_count_raw === undefined) ? null : Number(rfid_swipe_count_raw);

  const amount_debited_raw = pickField(docMerged, ['amount_debited', 'amountDebited', 'debited_amount', 'amount', 'debit'], null);
  const amount_debited = (amount_debited_raw === null || amount_debited_raw === undefined) ? null : Number(amount_debited_raw);

  const uid = pickField(docMerged, ['uid', 'userId', 'cardUid', 'rfid_uid'], null);

  const coin_collected_amount_raw = pickField(docMerged, ['coin_collected_amount', 'coinCollectedAmount', 'coinAmount', 'coins'], null);
  const coin_collected_amount = (coin_collected_amount_raw === null || coin_collected_amount_raw === undefined) ? null : Number(coin_collected_amount_raw);

  const remaining_balance_raw = pickField(docMerged, ['remaining_balance', 'remainingBalance', 'balance', 'remaining_bal'], null);
  const remaining_balance = (remaining_balance_raw === null || remaining_balance_raw === undefined) ? null : Number(remaining_balance_raw);

  const user_card_activated = pickField(docMerged, ['user_card_activated', 'userCardActivated', 'card_activated', 'activated'], null);
  const additional_status = pickField(docMerged, ['additional_status', 'add_status', 'extra_status'], null);

  const last_seen_raw = pickField(docMerged, ['last_seen', 'lastSeen', 'last_seen_at', 'lastSeenAt', 'seenAt', 'ts', 'recordedAt', 'uf_data.last_seen'], null);
  const last_seen = (last_seen_raw === null || last_seen_raw === undefined) ? null : (() => {
    const d = new Date(last_seen_raw);
    return isNaN(d) ? String(last_seen_raw) : d.toISOString();
  })();

  // date_time: prefer combined date/time fields, else pick date_time or recordedAt
  const dateVal = pickField(docMerged, ['date', 'recordedDate', '_id.date', 'uf_data.date'], null);
  const timeVal = pickField(docMerged, ['time', 'recordedTime', 'hour', 'uf_data.time'], null);
  let date_time = null;
  if ((dateVal && String(dateVal).trim()) || (timeVal && String(timeVal).trim())) {
    const dStr = dateVal ? String(dateVal).trim() : '';
    const tStr = timeVal ? String(timeVal).trim() : '';
    date_time = `${dStr}${dStr && tStr ? ' ' : ''}${tStr}`.trim();
  } else {
    const dtRaw = pickField(docMerged, ['date_time', 'datetime', 'timestamp', 'recordedAt', 'ts', 'uf_data.last_seen'], null);
    if (dtRaw !== null && dtRaw !== undefined) {
      const dd = new Date(dtRaw);
      date_time = isNaN(dd) ? String(dtRaw) : dd.toISOString();
    } else {
      date_time = null;
    }
  }

  return {
    tds,
    pulseCount,
    flowRate,
    recordedAt,
    setup_id,
    machine_id,
    status,
    water_dispensed,
    rfid_collected_amount,
    rfid_swipe_count,
    amount_debited,
    uid,
    coin_collected_amount,
    remaining_balance,
    user_card_activated,
    date_time,
    additional_status,
    last_seen,
  };
};

//////////////////////////////////////////////////////////////////////
// Existing endpoints (mostly unchanged)
//////////////////////////////////////////////////////////////////////

/**
 * GET /api/analysis/setups
 * Scans available collections for setup IDs (tries metadata.setup_id, meta.setup_id, setupId, setup_id)
 * Returns [{ value, label }, ...]
 */
exports.getAllSetupIds = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    let allSetupIds = [];

    for (const collInfo of collections) {
      const name = collInfo.name;
      try {
        const coll = db.collection(name);
        const docs = await coll.find({}).limit(200).toArray();
        if (!docs || docs.length === 0) continue;

        for (const d of docs) {
          const sid = pickField(d, ['metadata.setup_id', 'meta.setup_id', 'setup_id', 'setupId', 'metadata.setupId', 'setup']);
          if (sid) allSetupIds.push(String(sid));
        }
      } catch (err) {
        console.warn(`Skipping collection ${name}: ${err.message}`);
      }
    }

    const unique = [...new Set(allSetupIds)].filter(Boolean);
    const result = unique.map((s) => ({ value: String(s), label: String(s) }));

    return res.json(result);
  } catch (err) {
    console.error('getAllSetupIds error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/analysis/setup?setupId=<setupId>
 * Returns grouped metrics: UF and up to three ATW devices (ATW1..ATW3)
 * (unchanged: reads from Mongo)
 */
exports.getSetupMetrics = async (req, res) => {
  try {
    const { setupId } = req.query;
    if (!setupId) return res.status(400).json({ message: 'Missing setupId query parameter' });
    const sid = String(setupId);

    const query = {
      $or: [
        { 'metadata.setup_id': sid },
        { 'metadata.setupId': sid },
        { 'meta.setup_id': sid },
        { setup_id: sid },
        { setupId: sid },
      ],
    };

    // Fetch recent docs
    const ufDocs = await UfStats.find(query).sort({ recordedAt: -1, timestamp: -1 }).limit(10).lean();
    const atwDocs = await AtwStats.find(query).sort({ recordedAt: -1, timestamp: -1 }).limit(200).lean();

    const ufDoc = ufDocs && ufDocs.length ? ufDocs[0] : null;

    const result = {
      UF: { metrics: normalizeDocToMetrics(ufDoc), raw: ufDoc },
      ATW1: { metrics: normalizeDocToMetrics(null), raw: null },
      ATW2: { metrics: normalizeDocToMetrics(null), raw: null },
      ATW3: { metrics: normalizeDocToMetrics(null), raw: null },
    };

    // Group ATW docs by machine id or device id
    const atwMap = new Map();
    for (const d of atwDocs || []) {
      if (!d) continue;
      const machineId = pickField(d, ['metadata.machine_id', 'metadata.device_id', 'device_id', 'deviceId', 'machine_id', 'deviceLabel', '_id']);
      const key = machineId ? String(machineId) : String(d._id ?? '');
      if (!atwMap.has(key)) {
        atwMap.set(key, d);
      }
    }

    const atwEntries = Array.from(atwMap.entries()).slice(0, 3);
    atwEntries.forEach(([machineId, doc], idx) => {
      const key = `ATW${idx + 1}`;
      result[key] = {
        metrics: normalizeDocToMetrics(doc),
        raw: doc,
        deviceLabel: machineId,
      };
    });

    return res.json({ setupId: sid, metrics: result });
  } catch (err) {
    console.error('getSetupMetrics error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

//////////////////////////////////////////////////////////////////////
// UPDATED: GET /api/analysis/all?setupId=...&page=1&limit=50
// Now fetches from external stats API (your provided endpoint) and maps to
// the same paginated shape { setupId, total, page, limit, docs: [{metrics, raw}] }.
// Falls back to MongoDB-based search if external fails.
//////////////////////////////////////////////////////////////////////
exports.getAllForSetup = async (req, res) => {
  try {
    const { setupId } = req.query;
    if (!setupId) return res.status(400).json({ message: 'Missing setupId query parameter' });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(5, parseInt(req.query.limit, 10) || 50));
    // roleFilter kept for compatibility but external API returns all machines for a setup
    const roleFilter = req.query.role ? String(req.query.role).toUpperCase() : null;

    // Attempt to fetch from external API first
    try {
      const externalUrl = `${EXTERNAL_STATS_BASE}${EXTERNAL_STATS_FETCH_PATH}`;
      const externalResp = await axios.get(externalUrl, {
        params: { id: String(setupId) },
        timeout: 10_000,
      });

      const externalArray = externalResp && externalResp.data && Array.isArray(externalResp.data.response)
        ? externalResp.data.response
        : (Array.isArray(externalResp.data) ? externalResp.data : []);

      // optional: filter by role (ATW/UF) — external items don't always have role; skip if not meaningful
      const filtered = externalArray.filter((it) => {
        if (!roleFilter) return true;
        // try to infer role: presence of uf_data -> ATW or UF? External sample shows top-level ATW fields and nested uf_data
        // We'll treat items that have top-level uid/remaining_balance as ATW, and items that are purely uf_data as UF.
        const hasAtwMarkers = (it && (it.status || it.uid || it.remaining_balance || it.amount_debited || it.rfid_swipe_count));
        const hasUfMarkers = (it && (it.uf_data || it.tds || it.flow_rate || it.pulse_count));
        if (roleFilter === 'ATW') return hasAtwMarkers;
        if (roleFilter === 'UF') return hasUfMarkers;
        return true;
      });

      const total = filtered.length;
      const startIdx = (page - 1) * limit;
      const paged = filtered.slice(startIdx, startIdx + limit);

      const docs = paged.map((raw) => {
        // Map external shape to your metrics. Use normalizeDocToMetrics which merges uf_data.
        const metrics = normalizeDocToMetrics(raw);
        return { metrics, raw };
      });

      return res.json({
        setupId: String(setupId),
        total,
        page,
        limit,
        docs,
      });
    } catch (externalErr) {
      // Log and fallback
      console.warn(`External stats fetch failed for setup ${setupId}: ${externalErr && externalErr.message ? externalErr.message : externalErr}`);
      // fallback to mongo-based search (original behavior)
    }

    // FALLBACK: original MongoDB-based approach (if external fetch fails)
    const query = {
      $or: [
        { 'metadata.setup_id': String(setupId) },
        { 'metadata.setupId': String(setupId) },
        { 'meta.setup_id': String(setupId) },
        { setup_id: String(setupId) },
        { setupId: String(setupId) },
      ],
    };

    let allDocs = [];

    if (!roleFilter || roleFilter === 'UF') {
      const ufDocs = await UfStats.find(query).sort({ recordedAt: -1, timestamp: -1 }).lean();
      allDocs = allDocs.concat(ufDocs.map((d) => ({ ...d, role: 'UF' })));
    }

    if (!roleFilter || roleFilter === 'ATW') {
      const atwDocs = await AtwStats.find(query).sort({ recordedAt: -1, timestamp: -1 }).lean();
      allDocs = allDocs.concat(atwDocs.map((d) => ({ ...d, role: 'ATW' })));
    }

    allDocs.sort((a, b) => {
      const ta = a.timestamp ?? a.recordedAt ?? a._id;
      const tb = b.timestamp ?? b.recordedAt ?? b._id;
      const da = new Date(ta);
      const db = new Date(tb);
      if (!isNaN(da) && !isNaN(db)) return db - da;
      return String(tb).localeCompare(String(ta));
    });

    const total = allDocs.length;
    const startIdx = (page - 1) * limit;
    const paginated = allDocs.slice(startIdx, startIdx + limit);
    const docs = paginated.map((d) => ({ metrics: normalizeDocToMetrics(d), raw: d }));

    return res.json({
      setupId: String(setupId),
      total,
      page,
      limit,
      docs,
    });
  } catch (err) {
    console.error('getAllForSetup error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

//////////////////////////////////////////////////////////////////////
// Lightweight proxy: fetchStatsExternal
// GET /api/analysis/stats?id=<setupId>
// Returns the external API response as { response: [...] } or normalized fallback
//////////////////////////////////////////////////////////////////////
exports.fetchStatsExternal = async (req, res) => {
  try {
    const setupId = req.query.id || req.query.setupId || req.query.setup_id;
    if (!setupId) return res.status(400).json({ message: 'Missing id (setupId) query parameter' });

    const externalUrl = `${EXTERNAL_STATS_BASE}${EXTERNAL_STATS_FETCH_PATH}`;
    const resp = await axios.get(externalUrl, { params: { id: String(setupId) }, timeout: 10_000 });

    if (resp && resp.data && Array.isArray(resp.data.response)) {
      return res.json({ response: resp.data.response });
    }

    if (resp && resp.data && Array.isArray(resp.data)) {
      return res.json({ response: resp.data });
    }

    if (resp && resp.data && resp.data.response && typeof resp.data.response === 'object') {
      return res.json({ response: Array.isArray(resp.data.response) ? resp.data.response : [resp.data.response] });
    }

    return res.json({ response: [] });
  } catch (err) {
    console.error('fetchStatsExternal error:', err && err.message ? err.message : err);
    if (err && err.response && err.response.data) {
      const status = err.response.status || 502;
      return res.status(status).json({ message: 'External API error', detail: err.response.data });
    }
    return res.status(500).json({ message: 'Failed to fetch external stats' });
  }
};
