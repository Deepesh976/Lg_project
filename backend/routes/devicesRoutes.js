const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/devicesController');

router.post('/', ctrl.createDevice);
router.get('/', ctrl.listDevices);
router.get('/analysis/summary', ctrl.analysisSummary);
router.get('/:id', ctrl.getDevice);
router.put('/:id', ctrl.updateDevice);
router.delete('/:id', ctrl.deleteDevice);

module.exports = router;
