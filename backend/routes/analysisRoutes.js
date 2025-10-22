// routes/analysisRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/analysisController');

// ✅ Helper to safely register routes only if handler exists
function safeGet(path, handlerName) {
  const handler = controller[handlerName];
  if (typeof handler === 'function') {
    router.get(path, handler);
  } else {
    console.error(`⚠️ Missing handler for ${handlerName} — route ${path} disabled.`);
    router.get(path, (req, res) => {
      res.status(500).json({ message: `Handler ${handlerName} not implemented.` });
    });
  }
}

/**
 * Routes mapping (ATW Analysis only)
 * ---------------------------------
 * ✅ /api/analysis/setups → getAllSetupIds
 * ✅ /api/analysis/setup  → getSetupMetrics
 * ✅ /api/analysis/all    → getAllForSetup (paginated, normalized, external API first)
 * ✅ /api/analysis/stats  → fetchStatsExternal (proxy to external API)
 */
safeGet('/setups', 'getAllSetupIds');
safeGet('/setup', 'getSetupMetrics');
safeGet('/all', 'getAllForSetup');
safeGet('/stats', 'fetchStatsExternal');

module.exports = router;
