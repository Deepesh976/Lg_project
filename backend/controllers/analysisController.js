// controllers/analysisController.js
const mongoose = require('mongoose');
const axios = require('axios');
const { Analysis, AtwStats } = require('../models/Analysis'); // removed UfStats

// External stats service
const EXTERNAL_STATS_BASE = 'http://192.168.0.207:2222';
const EXTERNAL_STATS_FETCH_PATH = '/api/stats/fetch';

/* ---------------------- Helper Functions ---------------------- */

const pickField = (doc = {}, keys = [], fallback = null) => {
  if (!doc || typeof doc !== 'object') return fallback;
  const meta =
    (doc.metadata && typeof doc.metadata === 'object')
      ? doc.metadata
      : (doc.meta && typeof doc.meta === 'object' ? doc.meta : {});
  for (const k of keys) {
    if (!k) continue;
    if (Object.prototype.hasOwnProperty.call(doc, k) && doc[k] != null) return doc[k];
    if (Object.prototype.hasOwnProperty.call(meta, k) && meta[k] != null) return meta[k];
    if (typeof k === 'string') {
      const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (Object.prototype.hasOwnProperty.call(doc, camel) && doc[camel] != null) return doc[camel];
      if (Object.prototype.hasOwnProperty.call(meta, camel) && meta[camel] != null) return meta[camel];
    }
  }
  return fallback;
};

const normalizeDocToMetrics = (doc) => {
  if (!doc) {
    return {
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

  const docMerged = Object.assign({}, doc, { metadata: doc.metadata || doc.meta || {} });

  const setup_id = pickField(docMerged, ['_id.setup_id', 'setup_id', 'setupId', 'setup'], null);
  const machine_id = pickField(docMerged, ['_id.machine_id', 'machine_id', 'deviceId', 'device_id', 'deviceLabel', '_id'], null);
  const status = pickField(docMerged, ['status', 'state', 'additional_status'], null);
  const water_dispensed = Number(pickField(docMerged, ['water_dispensed', 'waterDispensed', 'water_dispense', 'water'], null)) || null;
  const rfid_collected_amount = Number(pickField(docMerged, ['rfid_collected_amount', 'rfidCollectedAmount', 'rfid_amount', 'rfidAmount'], null)) || null;
  const rfid_swipe_count = Number(pickField(docMerged, ['rfid_swipe_count', 'rfidSwipeCount', 'swipeCount'], null)) || null;
  const amount_debited = Number(pickField(docMerged, ['amount_debited', 'amountDebited', 'amount', 'debit'], null)) || null;
  const uid = pickField(docMerged, ['uid', 'userId', 'cardUid', 'rfid_uid'], null);
  const coin_collected_amount = Number(pickField(docMerged, ['coin_collected_amount', 'coinCollectedAmount', 'coinAmount', 'coins'], null)) || null;
  const remaining_balance = Number(pickField(docMerged, ['remaining_balance', 'remainingBalance', 'balance'], null)) || null;
  const user_card_activated = pickField(docMerged, ['user_card_activated', 'userCardActivated', 'card_activated'], null);
  const additional_status = pickField(docMerged, ['additional_status', 'add_status', 'extra_status'], null);
  const last_seen = pickField(docMerged, ['last_seen', 'lastSeen', 'recordedAt', 'ts'], null);
  const date_time = pickField(docMerged, ['date_time', 'datetime', 'timestamp', 'recordedAt'], null);

  return {
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

/* ---------------------- API Endpoints ---------------------- */

// GET /api/analysis/setups
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
        if (!docs.length) continue;

        for (const d of docs) {
          const sid = pickField(d, ['metadata.setup_id', 'meta.setup_id', 'setup_id', 'setupId']);
          if (sid) allSetupIds.push(String(sid));
        }
      } catch (err) {
        console.warn(`Skipping collection ${name}: ${err.message}`);
      }
    }

    const unique = [...new Set(allSetupIds)].filter(Boolean);
    const result = unique.map((s) => ({ value: s, label: s }));
    return res.json(result);
  } catch (err) {
    console.error('getAllSetupIds error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/analysis/setup?setupId=<setupId>
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

    // Fetch recent ATW documents
    const atwDocs = await AtwStats.find(query).sort({ recordedAt: -1, timestamp: -1 }).limit(200).lean();

    const result = {
      ATW1: { metrics: normalizeDocToMetrics(null), raw: null },
      ATW2: { metrics: normalizeDocToMetrics(null), raw: null },
      ATW3: { metrics: normalizeDocToMetrics(null), raw: null },
    };

    const atwMap = new Map();
    for (const d of atwDocs) {
      const machineId = pickField(d, ['metadata.machine_id', 'device_id', 'machine_id', 'deviceLabel', '_id']);
      const key = machineId ? String(machineId) : String(d._id ?? '');
      if (!atwMap.has(key)) atwMap.set(key, d);
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

// GET /api/analysis/all?setupId=...&page=1&limit=50
exports.getAllForSetup = async (req, res) => {
  try {
    const { setupId } = req.query;
    if (!setupId) return res.status(400).json({ message: 'Missing setupId query parameter' });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(5, parseInt(req.query.limit, 10) || 50));

    // Attempt external API first
    try {
      const externalUrl = `${EXTERNAL_STATS_BASE}${EXTERNAL_STATS_FETCH_PATH}`;
      const resp = await axios.get(externalUrl, { params: { id: String(setupId) }, timeout: 10_000 });

      const externalArray = resp?.data?.response ?? resp?.data ?? [];
      const total = externalArray.length;
      const startIdx = (page - 1) * limit;
      const paged = externalArray.slice(startIdx, startIdx + limit);

      const docs = paged.map((raw) => ({ metrics: normalizeDocToMetrics(raw), raw }));
      return res.json({ setupId, total, page, limit, docs });
    } catch (err) {
      console.warn(`External stats fetch failed: ${err.message}`);
    }

    // Fallback to Mongo
    const query = {
      $or: [
        { 'metadata.setup_id': String(setupId) },
        { 'metadata.setupId': String(setupId) },
        { 'meta.setup_id': String(setupId) },
        { setup_id: String(setupId) },
      ],
    };

    const atwDocs = await AtwStats.find(query).sort({ recordedAt: -1, timestamp: -1 }).lean();
    const total = atwDocs.length;
    const paginated = atwDocs.slice((page - 1) * limit, page * limit);
    const docs = paginated.map((d) => ({ metrics: normalizeDocToMetrics(d), raw: d }));

    return res.json({ setupId, total, page, limit, docs });
  } catch (err) {
    console.error('getAllForSetup error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/analysis/stats?id=<setupId>
exports.fetchStatsExternal = async (req, res) => {
  try {
    const setupId = req.query.id || req.query.setupId;
    if (!setupId) return res.status(400).json({ message: 'Missing id (setupId) query parameter' });

    const externalUrl = `${EXTERNAL_STATS_BASE}${EXTERNAL_STATS_FETCH_PATH}`;
    const resp = await axios.get(externalUrl, { params: { id: String(setupId) }, timeout: 10_000 });

    if (Array.isArray(resp.data?.response)) return res.json({ response: resp.data.response });
    if (Array.isArray(resp.data)) return res.json({ response: resp.data });
    if (resp.data?.response && typeof resp.data.response === 'object') {
      return res.json({ response: [resp.data.response] });
    }
    return res.json({ response: [] });
  } catch (err) {
    console.error('fetchStatsExternal error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch external stats' });
  }
};
