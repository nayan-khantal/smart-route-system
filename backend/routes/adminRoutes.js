const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const {roleMiddleware} = require('../utils/auth');

router.get('/dashboard', roleMiddleware(['admin']), admin.dashboard);

// Areas
router.get('/areas', roleMiddleware(['admin','user','driver']), admin.listAreas);
router.post('/areas', roleMiddleware(['admin']), admin.createArea);
router.put('/areas/:id', roleMiddleware(['admin']), admin.updateArea);
router.delete('/areas/:id', roleMiddleware(['admin']), admin.deleteArea);

// Routes
router.get('/routes', roleMiddleware(['admin']), admin.listRoutes);
router.post('/routes', roleMiddleware(['admin']), admin.createRoute);
router.put('/routes/:id', roleMiddleware(['admin']), admin.updateRoute);
router.delete('/routes/:id', roleMiddleware(['admin']), admin.deleteRoute);

// Trucks
router.get('/trucks', roleMiddleware(['admin']), admin.listTrucks);
router.post('/trucks', roleMiddleware(['admin']), admin.createTruck);
router.put('/trucks/:id', roleMiddleware(['admin']), admin.updateTruck);
router.delete('/trucks/:id', roleMiddleware(['admin']), admin.deleteTruck);

// Drivers
router.get('/drivers', roleMiddleware(['admin']), admin.listDrivers);
router.post('/drivers', roleMiddleware(['admin']), admin.createDriver);
router.put('/drivers/:id', roleMiddleware(['admin']), admin.updateDriver);
router.delete('/drivers/:id', roleMiddleware(['admin']), admin.deleteDriver);

// Users
router.get('/users', roleMiddleware(['admin']), admin.listUsers);

// Collections & Complaints
router.get('/collections', roleMiddleware(['admin']), admin.listCollections);
router.get('/complaints', roleMiddleware(['admin']), admin.listComplaints);
router.put('/complaints/:id', roleMiddleware(['admin']), admin.updateComplaintStatus);
router.put('/complaints/:id/assign', roleMiddleware(['admin']), admin.assignComplaintToDriver);
router.put('/complaints/:id/handle', roleMiddleware(['admin']), admin.handleComplaintAdmin);

// Complaint categories
router.get('/complaint-categories', roleMiddleware(['admin', 'user', 'driver']), admin.listComplaintCategories);

module.exports = router;