const Device = require('../models/Device');
const Price = require('../models/Price'); // assumed to reference device ObjectId

/**
 * Create device
 * POST /api/devices
 */
exports.createDevice = async (req, res) => {
  try {
    const { device_id, location = 'Unknown', price_per_litre = 0 } = req.body;

    if (!device_id) return res.status(400).json({ message: 'device_id is required' });
    if (price_per_litre === undefined || isNaN(price_per_litre))
      return res.status(400).json({ message: 'price_per_litre is required and must be a number' });

    const existing = await Device.findOne({ device_id });
    if (existing) return res.status(409).json({ message: 'device_id already exists' });

    const device = new Device({
      device_id,
      location,
      price_per_litre,
      last_update: Date.now()
    });

    await device.save();
    res.status(201).json(device);
  } catch (err) {
    console.error('createDevice error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * List devices with pagination & search
 * GET /api/devices?search=&page=1&limit=20
 */
exports.listDevices = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.max(1, parseInt(req.query.limit || 20));
    const search = (req.query.search || '').trim();

    const q = search
      ? {
          $or: [
            { device_id: new RegExp(search, 'i') },
            { location: new RegExp(search, 'i') }
          ]
        }
      : {};

    const [items, total] = await Promise.all([
      Device.find(q)
        .sort({ last_update: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Device.countDocuments(q)
    ]);

    res.json({ items, total, page, limit });
  } catch (err) {
    console.error('listDevices error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Get single device with latest price & price history
 * GET /api/devices/:id
 */
exports.getDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ message: 'Device not found' });

    const latestPrice = await Price.findOne({ device: device._id }).sort({ effectiveFrom: -1 }).lean();
    const priceHistory = await Price.find({ device: device._id }).sort({ effectiveFrom: -1 }).limit(50).lean();

    res.json({ device, latestPrice, priceHistory });
  } catch (err) {
    console.error('getDevice error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Update device
 * PUT /api/devices/:id
 */
exports.updateDevice = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Prevent changing unique identifier accidentally — optional
    if (updates.device_id) delete updates.device_id;

    // Ensure price_per_litre is numeric if provided
    if (updates.price_per_litre !== undefined && isNaN(updates.price_per_litre)) {
      return res.status(400).json({ message: 'price_per_litre must be a number' });
    }

    // touch last_update
    updates.last_update = Date.now();

    const device = await Device.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!device) return res.status(404).json({ message: 'Device not found' });

    res.json(device);
  } catch (err) {
    console.error('updateDevice error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Delete device
 * DELETE /api/devices/:id
 */
exports.deleteDevice = async (req, res) => {
  try {
    const removed = await Device.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Device not found' });

    // optionally cascade-delete prices
    await Price.deleteMany({ device: req.params.id });

    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('deleteDevice error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Device analysis endpoint
 * GET /api/devices/analysis/summary
 */
exports.analysisSummary = async (req, res) => {
  try {
    const total = await Device.countDocuments();

    // devices per location (top locations)
    const byLocation = await Device.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // recent devices
    const recent = await Device.find().sort({ last_update: -1 }).limit(10).lean();

    // average price per litre across devices
    const avgPriceAgg = await Device.aggregate([
      { $group: { _id: null, avgPrice: { $avg: '$price_per_litre' } } }
    ]);
    const avgPrice = avgPriceAgg[0] ? avgPriceAgg[0].avgPrice : 0;

    res.json({ total, byLocation, recent, avgPrice });
  } catch (err) {
    console.error('analysisSummary error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
