const express = require('express');
const router = express.Router();
const controller = require('../controllers/rfidController');
const validateObjectId = require('../middlewares/validateObjectId');

// CREATE
router.post('/', controller.createRfid);

// HISTORY routes must come BEFORE generic '/:id'
router.get('/:id/history', validateObjectId, controller.getRfidHistory);
router.post('/:id/history', validateObjectId, controller.createRfidHistory);

// GET single (after history)
router.get('/:id', validateObjectId, controller.getRfidById);

// update & delete
router.put('/:id', validateObjectId, controller.updateRfid);
router.delete('/:id', validateObjectId, controller.deleteRfid);

module.exports = router;
