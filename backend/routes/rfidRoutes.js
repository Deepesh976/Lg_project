// routes/rfidRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/rfidController');
const validateObjectId = require('../middlewares/validateObjectId');

// LIST all RFID users
router.get('/', controller.getAllRfid);

// CREATE new RFID user
router.post('/', controller.createRfid);

// UID lookup (must be before '/:id' to avoid conflict)
// e.g. GET /api/rfid/uid/ABC123
router.get('/uid/:uid', controller.getRfidByUid);

/**
 * NEW: Active RFIDs in a date range
 * Example: GET /api/rfid/active?from=2025-10-27&to=2025-10-30
 * This must be before '/:id' so "active" isn't treated as an ID.
 */
router.get('/active', controller.getActiveRfidsInRange);

// HISTORY routes must come BEFORE generic '/:id'
router.get('/:id/history', validateObjectId, controller.getRfidHistory);
router.post('/:id/history', validateObjectId, controller.createRfidHistory);

// GET proxy-backed history (no validateObjectId since 'id' may be uid)
// put before '/:id' so 'proxy-history' isn't treated as an ID
router.get('/:id/proxy-history', controller.getProxyHistory);

// GET single by ID (after history & uid routes)
router.get('/:id', validateObjectId, controller.getRfidById);

// UPDATE
router.put('/:id', validateObjectId, controller.updateRfid);

// DELETE
router.delete('/:id', validateObjectId, controller.deleteRfid);

module.exports = router;
