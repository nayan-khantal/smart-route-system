const express = require('express');
const router = express.Router();
const reports = require('../controllers/reportController');
const { roleMiddleware } = require('../utils/auth');

router.get('/summary', roleMiddleware(['admin']), reports.summary);
router.get('/insights', roleMiddleware(['admin']), reports.insights);
router.get('/area-wise', roleMiddleware(['admin']), reports.areaWise);
router.get('/drivers', roleMiddleware(['admin']), reports.drivers);
router.get('/truck-wise', roleMiddleware(['admin']), reports.truckWise);
router.get('/waste-type-distribution', roleMiddleware(['admin']), reports.wasteTypeDistribution);
router.get('/daily-summary', roleMiddleware(['admin']), reports.dailySummary);
router.get('/highest-areas', roleMiddleware(['admin']), reports.highestAreas);

module.exports = router;
