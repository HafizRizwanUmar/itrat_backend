const express = require('express');
const { login, register, getMe } = require('../controllers/authController');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/register', adminAuth, register);
router.get('/me', auth, getMe);

module.exports = router;

