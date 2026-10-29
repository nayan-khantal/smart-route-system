const express = require('express');
const router = express.Router();
const complaints = require('../controllers/complaintController');
const {authMiddleware, roleMiddleware} = require('../utils/auth');

router.post('/', roleMiddleware(['user']), complaints.submitComplaint);
router.get('/mine', roleMiddleware(['user']), complaints.listMyComplaints);
router.get('/assigned', roleMiddleware(['driver']), complaints.listAssignedComplaints);
router.get('/history', roleMiddleware(['driver']), complaints.listDriverHistory);
router.put('/:id/status', roleMiddleware(['driver']), complaints.updateDriverComplaintStatus);

module.exports = router;