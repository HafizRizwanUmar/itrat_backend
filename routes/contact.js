const express = require('express');
const {
  submitContactForm,
  getContactForms,
  getContactForm,
  updateContactStatus
} = require('../controllers/contactController');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(submitContactForm)
  .get(adminAuth, getContactForms);

router.get('/:id', adminAuth, getContactForm);
router.put('/:id/status', adminAuth, updateContactStatus);

module.exports = router;

