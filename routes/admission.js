const express = require('express');
const {
  submitAdmissionForm,
  getAdmissionForms,
  getAdmissionForm,
  updateAdmissionStatus
} = require('../controllers/admissionController');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(submitAdmissionForm)
  .get(adminAuth, getAdmissionForms);

router.get('/:id', adminAuth, getAdmissionForm);
router.put('/:id/status', adminAuth, updateAdmissionStatus);

module.exports = router;

