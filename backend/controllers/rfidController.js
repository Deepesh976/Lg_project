const Rfid = require('../models/Rfid');
const RfidHistory = require('../models/RfidHistory');

/**
 * @desc Create a new RFID record (User)
 * @route POST /api/rfid
 */
exports.createRfid = async (req, res) => {
  try {
    const data = req.body;

    // Validation
    if (!data.user_name || !data.mobile_no) {
      return res.status(400).json({ message: 'User name and Mobile number are required' });
    }

    const rfid = new Rfid({
      rfid_serial_no: data.rfid_serial_no,
      rfid_uid: data.rfid_uid,
      user_name: data.user_name,
      address: data.address,
      village: data.village,
      aadhar_no: data.aadhar_no,
      mobile_no: data.mobile_no,
      family_mems: data.family_mems || 0,
      quant_water_alloted_per_day: data.quant_water_alloted_per_day || 0,
      quant_water_alloted_per_month: data.quant_water_alloted_per_month || 0,
      swipe_count: data.swipe_count || 0,
      quant_water_used_in_month: data.quant_water_used_in_month || 0,
      allotment: data.allotment || '',
      remarks: data.remarks || ''
    });

    const saved = await rfid.save();
    return res.status(201).json(saved);
  } catch (err) {
    console.error('createRfid error:', err);
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
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc Get a single RFID record by ID
 * @route GET /api/rfid/:id
 */
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

/**
 * @desc Update RFID record by ID
 * @route PUT /api/rfid/:id
 */
exports.updateRfid = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const updated = await Rfid.findByIdAndUpdate(
      id,
      {
        $set: {
          rfid_serial_no: data.rfid_serial_no,
          rfid_uid: data.rfid_uid,
          user_name: data.user_name,
          address: data.address,
          village: data.village,
          aadhar_no: data.aadhar_no,
          mobile_no: data.mobile_no,
          family_mems: data.family_mems || 0,
          quant_water_alloted_per_day: data.quant_water_alloted_per_day || 0,
          quant_water_alloted_per_month: data.quant_water_alloted_per_month || 0,
          swipe_count: data.swipe_count || 0,
          quant_water_used_in_month: data.quant_water_used_in_month || 0,
          allotment: data.allotment || '',
          remarks: data.remarks || ''
        }
      },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: 'Record not found' });
    return res.json(updated);
  } catch (err) {
    console.error('updateRfid error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc Delete RFID record by ID
 * @route DELETE /api/rfid/:id
 */
exports.deleteRfid = async (req, res) => {
  try {
    const id = req.params.id;
    const removed = await Rfid.findByIdAndDelete(id);
    if (!removed) return res.status(404).json({ message: 'Record not found' });

    // Also delete related history entries
    await RfidHistory.deleteMany({ rfidId: id });

    return res.json({ message: 'RFID record and history deleted successfully' });
  } catch (err) {
    console.error('deleteRfid error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc Get RFID (User) history
 * @route GET /api/rfid/:id/history
 */
exports.getRfidHistory = async (req, res) => {
  try {
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
        quant_water_used_in_month: card.quant_water_used_in_month,
        allotment: card.allotment,
        remarks: card.remarks
      },
      history
    });
  } catch (err) {
    console.error('getRfidHistory error:', err);
    return res.status(500).json({ message: 'Server error' });
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

    if (!id) return res.status(400).json({ message: 'RFID ID missing' });

    const card = await Rfid.findById(id).lean();
    console.log('[createRfidHistory] found card=', !!card);

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
      quant_water_used_in_month: card.quant_water_used_in_month,
      allotment: card.allotment,
      remarks: card.remarks
    };

    const newEntry = new RfidHistory({
      rfidId: id,
      cardSnapshot: snapshot,
      meta: req.body.meta || {},
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : undefined
    });

    const saved = await newEntry.save();
    console.log('[createRfidHistory] saved id=', saved._id);
    return res.status(201).json({ message: 'RFID history entry created successfully', data: saved });
  } catch (err) {
    console.error('[createRfidHistory] error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
