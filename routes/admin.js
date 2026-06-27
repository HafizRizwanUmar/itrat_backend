const express = require('express');
const {
  getDashboardStats,
  getRecentActivity
} = require('../controllers/adminController');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard/stats', adminAuth, getDashboardStats);
router.get('/recent-activity', adminAuth, getRecentActivity);

module.exports = router;

