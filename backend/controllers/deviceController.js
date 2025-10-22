// controllers/deviceController.js
const mongoose = require('mongoose');
const Device = require('../models/Device');

let Price;
try {
  Price = require('../models/Price');
} catch (e) {
  Price = null;
  console.warn('Price model not found. Price-related endpoints will work but price history/cascade delete will be skipped.');
}

const ALLOWED_STATUSES = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];

/**
 * Create device
 * POST /api/device
 */
exports.createDevice = async (req, res) => {
  try {
    console.log('[createDevice] payload:', req.body);

    const {
      device_id,
      price_per_ltr,
      total_dispensed_litres = 0,
      location = 'Unknown',
      status = 'ACTIVE',
    } = req.body || {};

    // Validate device_id
    if (!device_id || typeof device_id !== 'string' || !device_id.trim()) {
      return res.status(400).json({ message: 'device_id is required and must be a non-empty string' });
    }
    const normalizedDeviceId = device_id.trim();

    // Validate price_per_ltr
    if (price_per_ltr === undefined || price_per_ltr === null || isNaN(Number(price_per_ltr))) {
      return res.status(400).json({ message: 'price_per_ltr is required and must be a number' });
    }
    const priceNum = Number(price_per_ltr);
    if (priceNum < 0) return res.status(400).json({ message: 'price_per_ltr must be >= 0' });

    // Validate total_dispensed_litres
    const totalLitresNum = Number(total_dispensed_litres || 0);
    if (isNaN(totalLitresNum) || totalLitresNum < 0) {
      return res.status(400).json({ message: 'total_dispensed_litres must be a number >= 0' });
    }

    // Validate status
    const normStatus = (String(status || 'ACTIVE')).toUpperCase();
    if (!ALLOWED_STATUSES.includes(normStatus)) {
      return res.status(400).json({ message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
    }

    // Check existing
    const existing = await Device.findOne({ device_id: normalizedDeviceId }).lean();
    if (existing) {
      console.warn('[createDevice] conflict, device_id exists:', normalizedDeviceId);
      return res.status(409).json({ message: 'device_id already exists' });
    }

    const device = new Device({
      device_id: normalizedDeviceId,
      price_per_ltr: priceNum,
      total_dispensed_litres: totalLitresNum,
      location: (location && String(location).trim()) || 'Unknown',
      status: normStatus,
      last_update: Date.now(),
    });

    await device.save();
    console.log('[createDevice] created:', device._id);
    // return the saved document (convert to plain object for consistency)
    const saved = (await Device.findById(device._id).lean()) || device;
    return res.status(201).json(saved);
  } catch (err) {
    console.error('[createDevice] error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate device_id', error: err.message });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', error: err.message });
    }
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * List devices with pagination & search
 * GET /api/device?search=&page=1&limit=20
 */
exports.listDevices = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
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
        .limit(limit)
        .lean(),
      Device.countDocuments(q)
    ]);

    return res.json({ items, total, page, limit });
  } catch (err) {
    console.error('[listDevices] error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Get single device with latest price & price history
 * GET /api/device/:id
 */
exports.getDevice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid device id' });
    }

    const device = await Device.findById(id).lean();
    if (!device) return res.status(404).json({ message: 'Device not found' });

    let latestPrice = null;
    let priceHistory = [];
    if (Price) {
      latestPrice = await Price.findOne({ device: device._id }).sort({ effectiveFrom: -1 }).lean();
      priceHistory = await Price.find({ device: device._id }).sort({ effectiveFrom: -1 }).limit(50).lean();
    }

    return res.json({ device, latestPrice, priceHistory });
  } catch (err) {
    console.error('[getDevice] error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Update device
 * PUT /api/device/:id
 */
exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid device id' });

    const updates = { ...req.body };

    // Prevent changing device_id
    if (updates.device_id) delete updates.device_id;

    // Normalize and validate numeric fields if present
    if (updates.price_per_ltr !== undefined && updates.price_per_ltr !== null) {
      if (isNaN(Number(updates.price_per_ltr)) || Number(updates.price_per_ltr) < 0) {
        return res.status(400).json({ message: 'price_per_ltr must be a number >= 0' });
      }
      updates.price_per_ltr = Number(updates.price_per_ltr);
    }

    if (updates.total_dispensed_litres !== undefined && updates.total_dispensed_litres !== null) {
      if (isNaN(Number(updates.total_dispensed_litres)) || Number(updates.total_dispensed_litres) < 0) {
        return res.status(400).json({ message: 'total_dispensed_litres must be a number >= 0' });
      }
      updates.total_dispensed_litres = Number(updates.total_dispensed_litres);
    }

    if (updates.status !== undefined && updates.status !== null) {
      const s = String(updates.status).toUpperCase();
      if (!ALLOWED_STATUSES.includes(s)) {
        return res.status(400).json({ message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
      }
      updates.status = s;
    }

    if (updates.location !== undefined && updates.location !== null) {
      updates.location = String(updates.location).trim() || 'Unknown';
    }

    // touch last_update
    updates.last_update = Date.now();

    const device = await Device.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
    if (!device) return res.status(404).json({ message: 'Device not found' });

    console.log('[updateDevice] updated:', id);
    return res.json(device);
  } catch (err) {
    console.error('[updateDevice] error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', error: err.message });
    }
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate key', error: err.message });
    }
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Delete device
 * DELETE /api/device/:id
 */
exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid device id' });

    const removed = await Device.findByIdAndDelete(id).lean();
    if (!removed) return res.status(404).json({ message: 'Device not found' });

    if (Price) {
      try {
        await Price.deleteMany({ device: id });
      } catch (e) {
        console.warn('[deleteDevice] failed to remove price entries for device', id, e);
      }
    }

    console.log('[deleteDevice] removed:', id);
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[deleteDevice] error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Device analysis endpoint
 * GET /api/device/analysis/summary
 */
exports.analysisSummary = async (req, res) => {
  try {
    const total = await Device.countDocuments();

    const byLocation = await Device.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const recent = await Device.find().sort({ last_update: -1 }).limit(10).lean();

    const avgPriceAgg = await Device.aggregate([
      { $group: { _id: null, avgPrice: { $avg: '$price_per_ltr' } } }
    ]);
    const avgPrice = (avgPriceAgg && avgPriceAgg[0] && avgPriceAgg[0].avgPrice) ? avgPriceAgg[0].avgPrice : 0;

    return res.json({ total, byLocation, recent, avgPrice });
  } catch (err) {
    console.error('[analysisSummary] error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
