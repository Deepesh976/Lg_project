// routes/rfidRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/rfidController');
const validateObjectId = require('../middlewares/validateObjectId');

// ✅ LIST all RFID users (fixes 404)
router.get('/', controller.getAllRfid);

// ✅ CREATE new RFID user
router.post('/', controller.createRfid);

// ✅ HISTORY routes must come BEFORE generic '/:id'
router.get('/:id/history', validateObjectId, controller.getRfidHistory);
router.post('/:id/history', validateObjectId, controller.createRfidHistory);

// ✅ GET single by ID (after history routes)
router.get('/:id', validateObjectId, controller.getRfidById);

// ✅ UPDATE
router.put('/:id', validateObjectId, controller.updateRfid);

// ✅ DELETE
router.delete('/:id', validateObjectId, controller.deleteRfid);

module.exports = router;
