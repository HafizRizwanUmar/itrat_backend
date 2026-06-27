const ContactForm = require('../models/ContactForm');
const { sendContactNotification, sendContactAutoReply } = require('../utils/mailer');

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
const submitContactForm = async (req, res) => {
  try {
    const contactForm = await ContactForm.create(req.body);

    // Fire-and-forget email notifications (don't block response)
    Promise.all([
      sendContactNotification(contactForm),
      sendContactAutoReply(contactForm)
    ]).catch(err => console.error('[Contact] Email error:', err.message));

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you within 24 hours.',
      data: contactForm
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message).join(', ');
      return res.status(400).json({ success: false, error: message });
    }
    res.status(500).json({ success: false, error: 'Server error while submitting contact form' });
  }
};

// @desc    Get all contact forms
// @route   GET /api/contact
// @access  Private/Admin
const getContactForms = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    let query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const contactForms = await ContactForm.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ContactForm.countDocuments(query);

    res.status(200).json({
      success: true,
      count: contactForms.length,
      total,
      pagination: { page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
      data: contactForms
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error while fetching contact forms' });
  }
};

// @desc    Get single contact form
// @route   GET /api/contact/:id
// @access  Private/Admin
const getContactForm = async (req, res) => {
  try {
    const contactForm = await ContactForm.findById(req.params.id);
    if (!contactForm) return res.status(404).json({ success: false, error: 'Contact form not found' });

    // Auto-mark as read when viewed
    if (contactForm.status === 'new') {
      contactForm.status = 'read';
      await contactForm.save();
    }

    res.status(200).json({ success: true, data: contactForm });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error while fetching contact form' });
  }
};

// @desc    Update contact form status
// @route   PUT /api/contact/:id/status
// @access  Private/Admin
const updateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new', 'read', 'resolved'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const contactForm = await ContactForm.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!contactForm) return res.status(404).json({ success: false, error: 'Contact form not found' });

    res.status(200).json({ success: true, message: 'Status updated', data: contactForm });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error while updating status' });
  }
};

module.exports = { submitContactForm, getContactForms, getContactForm, updateContactStatus };
