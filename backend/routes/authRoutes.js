const express = require('express');
const router = express.Router();
const {adminLogin,userLogin,driverLogin,registerUser} = require('../controllers/authController');
router.post('/login/admin', adminLogin);
router.post('/login/user', userLogin);
router.post('/login/driver', driverLogin);
router.post('/register', registerUser);
module.exports = router;