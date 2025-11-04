// controllers/rfidController.js
const axios = require('axios');
const mongoose = require('mongoose');
const Rfid = require('../models/Rfid');

// Try to require the history model (support common misspelling fallback)
let RfidHistory = null;
try {
  RfidHistory = require('../models/RfidHistory');
} catch (e1) {
  try {
    RfidHistory = require('../models/RfidHitory'); // fallback if file was misspelled
  } catch (e2) {
    RfidHistory = null;
    console.warn(
      'RfidHistory model not found (tried ../models/RfidHistory and ../models/RfidHitory). Model-backed history endpoints will return errors until model is added.'
    );
  }
}

/** ---------- Helpers: parse timestamps & normalize proxy data ---------- */

const getField = (obj, keys) => {
  if (!obj) return undefined;
  const tryKeys = Array.isArray(keys) ? keys : [keys];
  for (const k of tryKeys) {
    if (k in obj && obj[k] !== null && obj[k] !== undefined) return obj[k];
    if (typeof k === 'string') {
      const camel = k
        .replace(/[_\s]+([a-zA-Z])/g, (_, c) => c.toUpperCase())
        .replace(/\s/g, '');
      if (camel in obj && obj[camel] !== null && obj[camel] !== undefined)
        return obj[camel];
      const underscored = k.replace(/\s+/g, '_');
      if (underscored in obj && obj[underscored] !== null && obj[underscored] !== undefined)
        return obj[underscored];
    }
  }
  return undefined;
};

const tryParseFlexibleDate = (s) => {
  if (!s && s !== 0) return null;
  const str = String(s).trim();

  // direct ISO-ish parse
  const iso = Date.parse(str);
  if (!Number.isNaN(iso)) return new Date(iso);

  // split date and optional time
  const parts = str.split(' ');
  const datePart = parts[0];
  const timePart = parts.slice(1).join(' ');

  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = datePart.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (dmy) {
    let dd = dmy[1].padStart(2, '0');
    let mm = dmy[2].padStart(2, '0');
    let yy = dmy[3];
    if (yy.length === 2) yy = '20' + yy;
    const isoLike = `${yy}-${mm}-${dd}` + (timePart ? ` ${timePart}` : '');
    const parsed = Date.parse(isoLike);
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }

  // yyyy/mm/dd or yyyy-mm-dd
  const ymd = datePart.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (ymd) {
    const isoLike =
      `${ymd[1]}-${String(ymd[2]).padStart(2, '0')}-${String(ymd[3]).padStart(2, '0')}` +
      (timePart ? ` ${timePart}` : '');
    const parsed = Date.parse(isoLike);
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }

  // fallback: final attempt
  const last = Date.parse(str);
  if (!Number.isNaN(last)) return new Date(last);

  return null;
};

const parseRecordTimestamp = (rec) => {
  if (!rec || typeof rec !== 'object') return null;

  const get = (keys) => getField(rec, keys);

  // 1) numeric timestamp / ts
  const tsRaw = get(['timestamp', 'timeStamp', 'ts']);
  if (tsRaw !== undefined && tsRaw !== null && tsRaw !== '') {
    const n = Number(tsRaw);
    if (!Number.isNaN(n)) {
      // heuristics: if n >= 1e12 assume ms, if >1e9 treat as ms or seconds
      if (n > 1e12) return new Date(n);
      if (n > 1e9) return new Date(n);
      if (n > 0) return new Date(n * 1000);
    }
    const parsedISO = Date.parse(String(tsRaw));
    if (!Number.isNaN(parsedISO)) return new Date(parsedISO);
  }

  // 2) ISO-like fields
  const iso = get(['dateTime', 'datetime', 'DateTime', 'dt']);
  if (iso) {
    const parsed = Date.parse(String(iso));
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }

  // 3) Date + Time pair
  const dateField = get(['Date', 'date', 'transaction_date', 'TxnDate']);
  const timeField = get(['Time', 'time', 'transaction_time', 'TxnTime']);
  if (dateField) {
    const dateStr = String(dateField).trim();
    const timeStr = timeField ? String(timeField).trim() : '';
    const attempts = [];
    if (timeStr) attempts.push(`${dateStr} ${timeStr}`);
    attempts.push(dateStr);

    for (const attempt of attempts) {
      const p = tryParseFlexibleDate(attempt);
      if (p) return p;
    }
  }

  // 4) combined date_time fields
  const combined = get(['Date_Time', 'date_time', 'DateTime', 'dateTime']);
  if (combined) {
    const p = tryParseFlexibleDate(String(combined));
    if (p) return p;
  }

  // 5) try stringified fallback
  try {
    const str = JSON.stringify(rec);
    const p = tryParseFlexibleDate(str);
    if (p) return p;
  } catch (e) {
    // ignore
  }

  return null;
};

/**
 * Normalize device/proxy record into a predictable shape:
 * { rfid_uid, device_id, remaining_card_balance, dateStr, timeStr, litres, amount, price, raw }
 */
const normalizeProxyRecord = (item) => {
  const rfid = getField(item, ['RFID_UID', 'RFID UID', 'rfid_uid', 'uid']) || '';
  const deviceId = getField(item, ['Device Id', 'DeviceId', 'device_id']) || '';
  const remaining = getField(item, [
    'Remaining Card Balance',
    'RemainingBalance',
    'remaining_card_balance',
  ]);
  const litres = getField(item, ['Litres Consumed', 'Litres', 'litres_consumed']);
  const amount = getField(item, ['Amount Debited', 'AmountDebited', 'amount_debited']);
  const price = getField(item, ['Price Per Litre', 'PricePerLitre', 'price_per_litre']);
  const dateField = getField(item, ['Date', 'date']);
  const timeField = getField(item, ['Time', 'time']);
  return {
    rfid_uid: rfid,
    device_id: deviceId,
    remaining_card_balance: remaining,
    date: dateField ?? null,
    time: timeField ?? null,
    litres_consumed: litres,
    amount_debited: amount,
    price_per_litre: price,
    raw: item,
  };
};

/** ---------- CRUD endpoints (existing) ---------- */

/**
 * Helper: set both lastSeen (camelCase) and last_seen (snake_case) values on an update object
 * value must be a Date instance
 */
const setBothLastSeen = (updateObj, dateValue) => {
  if (!dateValue || !(dateValue instanceof Date)) return;
  updateObj.lastSeen = dateValue;
  updateObj.last_seen = dateValue;
};

exports.createRfid = async (req, res) => {
  try {
    const data = req.body || {};

    if (!data.user_name || !data.mobile_no) {
      return res.status(400).json({ message: 'User name and Mobile number are required' });
    }

    if (data.aadhar_no !== undefined && data.aadhar_no !== null) data.aadhar_no = String(data.aadhar_no);
    if (data.mobile_no !== undefined && data.mobile_no !== null) data.mobile_no = String(data.mobile_no);

    const family_mems = data.family_mems !== undefined ? Number(data.family_mems) : 0;
    const quant_water_alloted_per_day =
      data.quant_water_alloted_per_day !== undefined ? Number(data.quant_water_alloted_per_day) : 0;
    const quant_water_alloted_per_month =
      data.quant_water_alloted_per_month !== undefined ? Number(data.quant_water_alloted_per_month) : 0;
    const swipe_count = data.swipe_count !== undefined ? Number(data.swipe_count) : 0;
    const total_litres_consumed =
      data.total_litres_consumed !== undefined ? Number(data.total_litres_consumed) : 0;

    let remaining_card_balance = 0;
    if (data.remaining_card_balance !== undefined && data.remaining_card_balance !== null) {
      const n = Number(data.remaining_card_balance);
      remaining_card_balance = Number.isNaN(n) ? 0 : n < 0 ? 0 : n;
    }

    // Prefer explicit lastSeen/last_seen if provided; otherwise use now
    let initialLastSeen = null;
    if (data.lastSeen) {
      const d = new Date(data.lastSeen);
      if (!Number.isNaN(d.getTime())) initialLastSeen = d;
    } else if (data.last_seen) {
      const d = new Date(data.last_seen);
      if (!Number.isNaN(d.getTime())) initialLastSeen = d;
    }
    if (!initialLastSeen) initialLastSeen = new Date();

    const rfid = new Rfid({
      rfid_serial_no: data.rfid_serial_no || '',
      rfid_uid: data.rfid_uid || '',
      user_name: data.user_name,
      address: data.address || '',
      village: data.village || '',
      aadhar_no: data.aadhar_no || '',
      mobile_no: data.mobile_no,
      family_mems: Number.isNaN(family_mems) ? 0 : family_mems,
      quant_water_alloted_per_day: Number.isNaN(quant_water_alloted_per_day) ? 0 : quant_water_alloted_per_day,
      quant_water_alloted_per_month: Number.isNaN(quant_water_alloted_per_month) ? 0 : quant_water_alloted_per_month,
      swipe_count: Number.isNaN(swipe_count) ? 0 : swipe_count,
      total_litres_consumed: Number.isNaN(total_litres_consumed) ? 0 : total_litres_consumed,
      remaining_card_balance,
      remarks: data.remarks || '',
      lastSeen: initialLastSeen,
      last_seen: initialLastSeen,
    });

    const saved = await rfid.save();

    // Emit to connected clients so they can upsert the new record
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (io) {
        io.emit('rfid-record-updated', { record: saved.toObject ? saved.toObject() : saved });
      }
    } catch (e) {
      console.warn('createRfid: socket emit failed', e && e.message);
    }

    return res.status(201).json(saved);
  } catch (err) {
    console.error('createRfid error:', err);
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate key error', error: err.message });
    }
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/rfid
 * Supports q, page, limit, sort
 * Sorting preference: last_seen (snake_case) -> lastSeen -> updatedAt -> createdAt
 *
 * - If pagination requested (page & limit valid integers): use aggregation with $facet to get items + total
 * - If no pagination: use find().sort() directly (explicit)
 */
exports.getAllRfid = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    const sortParam = (req.query.sort || '').trim();

    // build match stage from q
    const match = {};
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      match.$or = [
        { rfid_uid: re },
        { user_name: re },
        { mobile_no: re },
        { village: re },
        { rfid_serial_no: re },
        { address: re },
        { aadhar_no: re },
      ];
    }

    // determine sort object (single field) or default multi-field
    let sortObj = { last_seen: -1};
    if (sortParam) {
      const [field, dir] = sortParam.split(':').map(s => s.trim());
      if (field) {
        sortObj = { [field]: dir === 'asc' ? 1 : -1 };
      }
    } else {
      // Note: MongoDB will apply first key precedence; we want to prefer last_seen then lastSeen then updatedAt etc.
      // Build an ordered object for sort where keys are in desired order.
      sortObj = {};
      sortObj.last_seen = -1;
      sortObj.lastSeen = -1;
      sortObj.updatedAt = -1;
      sortObj.createdAt = -1;
    }

    // Non-paginated: explicit find().sort()
    if (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1) {
      const list = await Rfid.find(match).sort(sortObj).lean();
      return res.status(200).json(list);
    }

    // Paginated: use aggregation pipeline with $facet
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: match },
      // Project nothing special here; keep full documents
      { $sort: sortObj },
      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: limit },
            { $replaceRoot: { newRoot: "$$ROOT" } } // ensure roots are documents
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ];

    const agg = await Rfid.aggregate(pipeline).exec();
    const items = (agg[0] && agg[0].items) || [];
    const total = (agg[0] && agg[0].totalCount && agg[0].totalCount[0] && agg[0].totalCount[0].count) || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.status(200).json({
      items,
      total,
      page,
      limit,
      totalPages
    });
  } catch (err) {
    console.error('getAllRfid error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getRfidById = async (req, res) => {
  try {
    const id = req.params.id;
    const record = await Rfid.findById(id).lean();
    if (!record) return res.status(404).json({ message: 'RFID record not found' });
    return res.json(record);
  } catch (err) {
    console.error('getRfidById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getRfidByUid = async (req, res) => {
  try {
    const uid = req.params.uid;
    if (!uid) return res.status(400).json({ message: 'RFID UID missing' });

    const record = await Rfid.findOne({ rfid_uid: String(uid) }).lean();
    if (!record) return res.status(404).json({ message: 'RFID record not found' });
    return res.status(200).json(record);
  } catch (err) {
    console.error('getRfidByUid error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * New endpoint:
 * GET /api/rfid/active?from=YYYY-MM-DD&to=YYYY-MM-DD
 * - runs aggregation on `live_rfid_transactions` to find distinct metadata.rfid_uid values in the range
 * - returns matching Rfid documents as { items: [...], total: n }
 */
exports.getActiveRfidsInRange = async (req, res) => {
  try {
    const { from, to } = req.query;

    // Parse dates using existing helper to be flexible
    let fromDate = null;
    let toDate = null;
    if (from) fromDate = tryParseFlexibleDate(from);
    if (to) toDate = tryParseFlexibleDate(to);

    // If parse failed but value provided, try direct Date
    if (from && !fromDate) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) fromDate = d;
    }
    if (to && !toDate) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) toDate = d;
    }

    // set inclusive range defaults if not provided
    const minTs = new Date(-8640000000000000);
    const maxTs = new Date(8640000000000000);
    const gte = fromDate || minTs;
    const lte = toDate ? new Date(new Date(toDate).setHours(23,59,59,999)) : maxTs;

    // Validate
    if (from && !(gte instanceof Date) || to && !(lte instanceof Date)) {
      return res.status(400).json({ message: "Invalid 'from' or 'to' date. Use a supported date format (YYYY-MM-DD, DD/MM/YYYY, ISO, etc)." });
    }

    // use native collection for aggregation
    const coll = mongoose.connection.db.collection('live_rfid_transactions');

    const pipeline = [
      { $match: { timestamp: { $gte: gte, $lte: lte } } },
      { $group: { _id: '$metadata.rfid_uid' } },
      { $match: { _id: { $ne: null } } },
      { $project: { rfid_uid: '$_id', _id: 0 } }
    ];

    const aggRes = await coll.aggregate(pipeline).toArray();
    const uids = aggRes.map(d => d.rfid_uid).filter(Boolean);

    if (!uids || uids.length === 0) {
      return res.status(200).json({ items: [], total: 0 });
    }

    // find matching user records
    const users = await Rfid.find({ rfid_uid: { $in: uids } }).lean().exec();

    // order results to follow the uids order (keep only found docs)
    const userByUid = new Map(users.map(u => [String(u.rfid_uid), u]));
    const ordered = uids.map(uid => userByUid.get(String(uid))).filter(Boolean);

    return res.status(200).json({ items: ordered, total: ordered.length });
  } catch (err) {
    console.error('getActiveRfidsInRange error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateRfid = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body || {};

    if (data.aadhar_no !== undefined && data.aadhar_no !== null) data.aadhar_no = String(data.aadhar_no);
    if (data.mobile_no !== undefined && data.mobile_no !== null) data.mobile_no = String(data.mobile_no);

    const updateFields = {};
    const setters = ['rfid_serial_no','rfid_uid','user_name','address','village','aadhar_no','mobile_no','remarks'];
    setters.forEach((k) => { if (data[k] !== undefined) updateFields[k] = data[k]; });

    if (data.family_mems !== undefined) {
      const v = Number(data.family_mems);
      updateFields.family_mems = Number.isNaN(v) ? 0 : v;
    }
    if (data.quant_water_alloted_per_day !== undefined) {
      const v = Number(data.quant_water_alloted_per_day);
      updateFields.quant_water_alloted_per_day = Number.isNaN(v) ? 0 : v;
    }
    if (data.quant_water_alloted_per_month !== undefined) {
      const v = Number(data.quant_water_alloted_per_month);
      updateFields.quant_water_alloted_per_month = Number.isNaN(v) ? 0 : v;
    }
    if (data.swipe_count !== undefined) {
      const v = Number(data.swipe_count);
      updateFields.swipe_count = Number.isNaN(v) ? 0 : v;
    }
    if (data.total_litres_consumed !== undefined) {
      const v = Number(data.total_litres_consumed);
      updateFields.total_litres_consumed = Number.isNaN(v) ? 0 : v;
    }

    if (data.remaining_card_balance !== undefined) {
      const v = Number(data.remaining_card_balance);
      if (Number.isNaN(v) || v < 0) {
        return res.status(400).json({ message: 'remaining_card_balance must be a non-negative number' });
      }
      updateFields.remaining_card_balance = v;
    }

    // lastSeen handling:
    let providedLastSeen = null;
    if (data.last_seen) {
      const d = new Date(data.last_seen);
      if (!Number.isNaN(d.getTime())) providedLastSeen = d;
    } else if (data.lastSeen) {
      const d = new Date(data.lastSeen);
      if (!Number.isNaN(d.getTime())) providedLastSeen = d;
    }

    if (providedLastSeen) {
      // use provided
      setBothLastSeen(updateFields, providedLastSeen);
    } else {
      // refresh to now to mark activity/update (this will move record to top)
      setBothLastSeen(updateFields, new Date());
    }

    const updated = await Rfid.findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true });

    if (!updated) return res.status(404).json({ message: 'Record not found' });

    // Emit updated record to clients so UI will upsert and move it to top
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (io) {
        io.emit('rfid-record-updated', { record: updated.toObject ? updated.toObject() : updated });
      }
    } catch (e) {
      console.warn('updateRfid: socket emit failed', e && e.message);
    }

    return res.json(updated);
  } catch (err) {
    console.error('updateRfid error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteRfid = async (req, res) => {
  try {
    const id = req.params.id;
    const removed = await Rfid.findByIdAndDelete(id);
    if (!removed) return res.status(404).json({ message: 'Record not found' });

    // Emit delete event (optional) so clients can remove the record locally.
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (io) {
        io.emit('rfid-record-updated', { deletedId: id });
      }
    } catch (e) {
      console.warn('deleteRfid: socket emit failed', e && e.message);
    }

    return res.json({ message: 'RFID record deleted successfully' });
  } catch (err) {
    console.error('deleteRfid error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/** ---------- Model-backed history endpoints (if model present) ---------- */

exports.getRfidHistory = async (req, res) => {
  try {
    if (!RfidHistory) {
      return res.status(500).json({ message: 'RFID history model not available on server' });
    }

    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'RFID ID missing' });

    const card = await Rfid.findById(id).lean();
    if (!card) return res.status(404).json({ message: 'RFID card not found' });

    const history = await RfidHistory.find({ rfidId: id }).sort({ timestamp: -1 }).lean();

    return res.status(200).json({
      message: 'RFID history fetched successfully',
      count: history.length,
      meta: {
        rfid_serial_no: card.rfid_serial_no,
        rfid_uid: card.rfid_uid,
        user_name: card.user_name,
        address: card.address,
        village: card.village,
        aadhar_no: card.aadhar_no,
        mobile_no: card.mobile_no,
        family_mems: card.family_mems,
        quant_water_alloted_per_day: card.quant_water_alloted_per_day,
        quant_water_alloted_per_month: card.quant_water_alloted_per_month,
        swipe_count: card.swipe_count,
        total_litres_consumed: card.total_litres_consumed,
        remaining_card_balance: card.remaining_card_balance,
        remarks: card.remarks,
        lastSeen: card.lastSeen,
        last_seen: card.last_seen,
      },
      history,
    });
  } catch (err) {
    console.error('getRfidHistory error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.createRfidHistory = async (req, res) => {
  try {
    if (!RfidHistory) {
      return res.status(500).json({ message: 'RFID history model not available on server' });
    }

    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'RFID ID missing' });

    const card = await Rfid.findById(id).lean();
    if (!card) return res.status(404).json({ message: 'RFID card not found' });

    const snapshot = {
      rfid_serial_no: card.rfid_serial_no,
      rfid_uid: card.rfid_uid,
      user_name: card.user_name,
      address: card.address,
      village: card.village,
      aadhar_no: card.aadhar_no,
      mobile_no: card.mobile_no,
      family_mems: card.family_mems,
      quant_water_alloted_per_day: card.quant_water_alloted_per_day,
      quant_water_alloted_per_month: card.quant_water_alloted_per_month,
      swipe_count: card.swipe_count,
      total_litres_consumed: card.total_litres_consumed,
      remaining_card_balance: card.remaining_card_balance,
      remarks: card.remarks,
    };

    const newEntry = new RfidHistory({
      rfidId: id,
      cardSnapshot: snapshot,
      meta: req.body.meta || {},
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : undefined,
    });

    const saved = await newEntry.save();

    // Emit to clients so they know this card was active/updated
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (io) {
        try {
          // fetch fresh card doc and update lastSeen / last_seen
          const cardDoc = await Rfid.findById(id);
          if (cardDoc) {
            const lastDt = saved.timestamp || new Date();
            cardDoc.lastSeen = lastDt;
            cardDoc.last_seen = lastDt;
            await cardDoc.save();
            io.emit('rfid-record-updated', { record: cardDoc.toObject ? cardDoc.toObject() : cardDoc });
          } else {
            io.emit('rfid-record-updated', { rfidUid: String(id), lastSeen: saved.timestamp || new Date().toISOString(), last_seen: saved.timestamp || new Date().toISOString() });
          }
        } catch (e) {
          // fallback: emit uid + timestamp
          io.emit('rfid-record-updated', { rfidUid: String(id), lastSeen: saved.timestamp || new Date().toISOString(), last_seen: saved.timestamp || new Date().toISOString() });
        }
      }
    } catch (e) {
      console.warn('createRfidHistory: failed to emit socket event', e && e.message);
    }

    return res.status(201).json({ message: 'RFID history entry created successfully', data: saved });
  } catch (err) {
    console.error('[createRfidHistory] error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/** ---------- Proxy-backed history endpoint (normalized + sorted) ---------- */

exports.getProxyHistory = async (req, res) => {
  try {
    const uid = req.params.id;
    if (!uid) return res.status(400).json({ message: 'RFID UID missing' });

    // prefer an explicit base URL for proxy (set PROXY_BASE_URL in env),
    // otherwise call the local server's /api/proxy/atw/:uid endpoint
    const proxyBase = process.env.PROXY_BASE_URL || `${req.protocol}://${req.get('host')}/api/proxy`;
    const url = `${proxyBase.replace(/\/$/, '')}/atw/${encodeURIComponent(uid)}`;

    const proxRes = await axios.get(url, { timeout: 15000 });
    const data = proxRes?.data ?? {};

    // extract records array from common shapes
    let records = [];
    if (Array.isArray(data.response)) records = data.response;
    else if (Array.isArray(data)) records = data;
    else if (Array.isArray(data.data)) records = data.data;
    else if (Array.isArray(data.items)) records = data.items;
    else if (data && typeof data === 'object') {
      const arr = Object.values(data).find((v) => Array.isArray(v));
      records = arr || [];
    }

    // normalize and compute timestamps
    const normalized = records.map((r) => {
      const norm = normalizeProxyRecord(r);
      const ts = parseRecordTimestamp(r); // Date or null
      return {
        ...norm,
        timestamp: ts ? ts.toISOString() : null,
      };
    });

    // sort newest first (items with no timestamp go to the end)
    normalized.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });

    // --- update the Rfid.lastSeen / last_seen for this uid using newest record's timestamp ---
    try {
      const newest = normalized.find((x) => x && x.timestamp);
      const lastSeenDate = newest ? new Date(newest.timestamp) : new Date();

      const updateResult = await Rfid.findOneAndUpdate(
        { rfid_uid: String(uid) },
        { $set: { lastSeen: lastSeenDate, last_seen: lastSeenDate } },
        { new: true }
      );

      if (!updateResult) {
        console.warn(`getProxyHistory: no Rfid document found for uid=${uid} to update lastSeen`);
      } else {
        console.log(`getProxyHistory: updated lastSeen for uid=${uid} -> ${lastSeenDate.toISOString()}`);
        try {
          const io = req.app && req.app.get && req.app.get('io');
          if (io) {
            io.emit('rfid-record-updated', { record: updateResult.toObject ? updateResult.toObject() : updateResult });
          }
        } catch (e) {
          console.warn('getProxyHistory: failed to emit socket event', e && e.message);
        }
      }
    } catch (updateErr) {
      console.error(`getProxyHistory: failed to update lastSeen for uid=${uid}:`, updateErr && updateErr.message);
    }

    return res.status(200).json({
      message: 'Proxy history fetched and normalized',
      count: normalized.length,
      data: normalized,
    });
  } catch (err) {
    console.error('getProxyHistory error:', err);
    if (err.response) {
      return res.status(err.response.status || 502).json({
        message: 'Proxy/device returned an error',
        proxyError: err.response.data,
      });
    }
    if (err.request) {
      return res.status(504).json({ message: 'No response from proxy/device' });
    }
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};