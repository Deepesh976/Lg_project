// controllers/userController.js
const User = require('../models/User');

/**
 * Create a new user
 * POST /api/users
 */
exports.createUser = async (req, res) => {
  try {
    const data = req.body;

    if (!data.user_name || !data.mobile_no) {
      return res.status(400).json({ message: 'user_name and mobile_no are required' });
    }

    // Normalize aadhar/mobile to strings
    if (data.aadhar_no !== undefined) data.aadhar_no = String(data.aadhar_no);
    data.mobile_no = String(data.mobile_no);

    const user = new User({
      rfid_serial_no: data.rfid_serial_no || '',
      rfid_uid: data.rfid_uid || '',
      user_name: data.user_name,
      address: data.address || '',
      village: data.village || '',
      aadhar_no: data.aadhar_no || '',
      mobile_no: data.mobile_no,
      family_mems: data.family_mems || 1,
      quant_water_alloted_per_day: data.quant_water_alloted_per_day || 0,
      quant_water_alloted_per_month: data.quant_water_alloted_per_month || 0,
      swipe_count: data.swipe_count || 0,
      allotment: data.allotment || '',
      remarks: data.remarks || ''
    });

    const saved = await user.save();
    return res.status(201).json(saved);
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * List users with optional search & pagination
 * GET /api/users?search=&page=1&limit=50
 */
exports.listUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '100', 10));
    const search = (req.query.search || '').trim();

    const q = search
      ? {
          $or: [
            { user_name: new RegExp(search, 'i') },
            { address: new RegExp(search, 'i') },
            { village: new RegExp(search, 'i') },
            { aadhar_no: new RegExp(search, 'i') },
            { mobile_no: new RegExp(search, 'i') }
          ]
        }
      : {};

    const [items, total] = await Promise.all([
      User.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(q)
    ]);

    return res.json({ items, total, page, limit });
  } catch (err) {
    console.error('listUsers error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Get single user by ID
 * GET /api/users/:id
 */
exports.getUserById = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('getUserById error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Update a user by ID
 * PUT /api/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    if (data.aadhar_no !== undefined) data.aadhar_no = String(data.aadhar_no);
    if (data.mobile_no !== undefined) data.mobile_no = String(data.mobile_no);

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: 'User not found' });
    return res.json(updated);
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Delete a user
 * DELETE /api/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    const removed = await User.findByIdAndDelete(id);
    if (!removed) return res.status(404).json({ message: 'User not found' });
    return res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
