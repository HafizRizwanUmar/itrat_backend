const AdmissionForm = require('../models/AdmissionForm');
const Course = require('../models/Course');
const { sendAdmissionNotification, sendAdmissionAutoReply } = require('../utils/mailer');

// @desc    Submit admission form
// @route   POST /api/admission
// @access  Public
const submitAdmissionForm = async (req, res) => {
  try {
    // Validate course exists
    const course = await Course.findOne({ _id: req.body.courseId, isActive: true });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found or no longer available' });
    }

    const admissionForm = await AdmissionForm.create(req.body);
    await admissionForm.populate('courseId', 'title instructor');

    // Fire-and-forget email notifications
    Promise.all([
      sendAdmissionNotification(admissionForm, course.title),
      sendAdmissionAutoReply(admissionForm, course.title)
    ]).catch(err => console.error('[Admission] Email error:', err.message));

    res.status(201).json({
      success: true,
      message: 'Your admission application has been submitted. We will contact you within 2-3 business days, in sha Allah.',
      data: admissionForm
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message).join(', ');
      return res.status(400).json({ success: false, error: message });
    }
    res.status(500).json({ success: false, error: 'Server error while submitting admission form' });
  }
};

// @desc    Get all admission forms
// @route   GET /api/admission
// @access  Private/Admin
const getAdmissionForms = async (req, res) => {
  try {
    const { status, courseId, search, page = 1, limit = 10 } = req.query;
    let query = {};
    if (status) query.status = status;
    if (courseId) query.courseId = courseId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const admissionForms = await AdmissionForm.find(query)
      .populate('courseId', 'title instructor')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AdmissionForm.countDocuments(query);

    res.status(200).json({
      success: true,
      count: admissionForms.length,
      total,
      pagination: { page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
      data: admissionForms
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error while fetching admission forms' });
  }
};

// @desc    Get single admission form
// @route   GET /api/admission/:id
// @access  Private/Admin
const getAdmissionForm = async (req, res) => {
  try {
    const admissionForm = await AdmissionForm.findById(req.params.id)
      .populate('courseId', 'title instructor');
    if (!admissionForm) return res.status(404).json({ success: false, error: 'Admission form not found' });

    res.status(200).json({ success: true, data: admissionForm });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error while fetching admission form' });
  }
};

// @desc    Update admission form status
// @route   PUT /api/admission/:id/status
// @access  Private/Admin
const updateAdmissionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'incomplete', 'complete'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const admissionForm = await AdmissionForm.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('courseId', 'title instructor');

    if (!admissionForm) return res.status(404).json({ success: false, error: 'Admission form not found' });

    res.status(200).json({ success: true, message: 'Status updated', data: admissionForm });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error while updating status' });
  }
};

module.exports = { submitAdmissionForm, getAdmissionForms, getAdmissionForm, updateAdmissionStatus };
