// controllers/rfidController.js
const mongoose = require('mongoose');
const Rfid = require('../models/Rfid');

/**
 * @desc Create a new RFID record (User)
 * @route POST /api/rfid
 */
exports.createRfid = async (req, res) => {
  try {
    const data = req.body || {};

    // Minimal validation
    if (!data.user_name || !data.mobile_no) {
      return res.status(400).json({ message: 'User name and Mobile number are required' });
    }

    // Normalize identifiers to strings to preserve leading zeros
    if (data.aadhar_no !== undefined && data.aadhar_no !== null) data.aadhar_no = String(data.aadhar_no);
    if (data.mobile_no !== undefined && data.mobile_no !== null) data.mobile_no = String(data.mobile_no);

    // Parse numeric fields safely
    const family_mems = data.family_mems !== undefined ? Number(data.family_mems) : 0;
    const quant_water_alloted_per_day = data.quant_water_alloted_per_day !== undefined
      ? Number(data.quant_water_alloted_per_day)
      : 0;
    const quant_water_alloted_per_month = data.quant_water_alloted_per_month !== undefined
      ? Number(data.quant_water_alloted_per_month)
      : 0;
    const swipe_count = data.swipe_count !== undefined ? Number(data.swipe_count) : 0;
    const total_litres_consumed = data.total_litres_consumed !== undefined ? Number(data.total_litres_consumed) : 0;

    // remaining_card_balance: ensure a non-negative number
    let remaining_card_balance = 0;
    if (data.remaining_card_balance !== undefined && data.remaining_card_balance !== null) {
      const n = Number(data.remaining_card_balance);
      remaining_card_balance = Number.isNaN(n) ? 0 : n < 0 ? 0 : n;
    }

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
    });

    const saved = await rfid.save();
    return res.status(201).json(saved);
  } catch (err) {
    console.error('createRfid error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate key error', error: err.message });
    }
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * @desc Get all RFID (User) records
 * @route GET /api/rfid
 */
exports.getAllRfid = async (req, res) => {
  try {
    const list = await Rfid.find().sort({ createdAt: -1 }).lean();
    return res.json(list);
  } catch (err) {
    console.error('getAllRfid error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * @desc Get a single RFID record by ID
 * @route GET /api/rfid/:id
 */
exports.getRfidById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid or missing id' });
    }

    const record = await Rfid.findById(id).lean();
    if (!record) return res.status(404).json({ message: 'RFID record not found' });
    return res.json(record);
  } catch (err) {
    console.error('getRfidById error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * @desc Update RFID record by ID
 * @route PUT /api/rfid/:id
 */
exports.updateRfid = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body || {};

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid or missing id' });
    }

    if (data.aadhar_no !== undefined && data.aadhar_no !== null) data.aadhar_no = String(data.aadhar_no);
    if (data.mobile_no !== undefined && data.mobile_no !== null) data.mobile_no = String(data.mobile_no);

    const updateFields = {};

    const setters = [
      'rfid_serial_no',
      'rfid_uid',
      'user_name',
      'address',
      'village',
      'aadhar_no',
      'mobile_no',
      'remarks',
    ];
    setters.forEach((k) => {
      if (data[k] !== undefined) updateFields[k] = data[k];
    });

    // numeric fields
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

    // remaining_card_balance: validate non-negative
    if (data.remaining_card_balance !== undefined) {
      const v = Number(data.remaining_card_balance);
      if (Number.isNaN(v) || v < 0) {
        return res.status(400).json({ message: 'remaining_card_balance must be a non-negative number' });
      }
      updateFields.remaining_card_balance = v;
    }

    const updated = await Rfid.findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true });

    if (!updated) return res.status(404).json({ message: 'Record not found' });
    return res.json(updated);
  } catch (err) {
    console.error('updateRfid error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * @desc Delete RFID record by ID
 * @route DELETE /api/rfid/:id
 *
 * Behavior:
 *  - Validates id
 *  - Deletes the RFID document
 *  - Attempts to delete related history but will not fail the whole operation if history deletion errors
 *  - Returns 200 on success, appropriate 4xx on client errors or 5xx on server errors
 */
exports.deleteRfid = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid or missing id' });
    }

    const removed = await Rfid.findByIdAndDelete(id);
    if (!removed) return res.status(404).json({ message: 'Record not found' });

    // Try deleting related history — don't let failures here turn into a 500 after the main doc is deleted.
    try {
      await RfidHistory.deleteMany({ rfidId: id });
    } catch (histErr) {
      // Log and continue — main deletion already happened.
      console.error(`Warning: failed to delete RfidHistory for rfidId=${id}`, histErr);
    }

    return res.status(200).json({ message: 'RFID record deleted successfully' });
  } catch (err) {
    console.error('deleteRfid error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * @desc Get RFID (User) history
 * @route GET /api/rfid/:id/history
 */
exports.getRfidHistory = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'RFID ID missing or invalid' });

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
      },
      history,
    });
  } catch (err) {
    console.error('getRfidHistory error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * @desc Add a new entry to RFID history
 * @route POST /api/rfid/:id/history
 */
exports.createRfidHistory = async (req, res) => {
  try {
    const id = req.params.id;
    console.log('[createRfidHistory] called for id=', id, 'body=', req.body);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'RFID ID missing or invalid' });

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
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : Date.now(),
    });

    const saved = await newEntry.save();
    console.log('[createRfidHistory] saved id=', saved._id);
    return res.status(201).json({
      message: 'RFID history entry created successfully',
      data: saved,
    });
  } catch (err) {
    console.error('[createRfidHistory] error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
