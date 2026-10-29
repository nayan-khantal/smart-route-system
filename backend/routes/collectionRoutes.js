const express = require('express');
const router = express.Router();
const collections = require('../controllers/collectionController');
const { roleMiddleware } = require('../utils/auth');

router.post('/', roleMiddleware(['driver', 'admin']), collections.createCollection);
router.get('/', roleMiddleware(['driver', 'admin']), collections.listCollections);
router.get('/today', roleMiddleware(['driver', 'admin']), collections.listTodayCollections);
router.get('/area-wise', roleMiddleware(['admin']), collections.areaWiseCollections);
router.get('/truck-wise', roleMiddleware(['admin']), collections.truckWiseCollections);
router.get('/driver-context', roleMiddleware(['driver']), collections.getDriverCollectionContext);

module.exports = router;
