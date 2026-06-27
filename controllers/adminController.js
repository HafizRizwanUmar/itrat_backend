const Course         = require('../models/Course');
const LibraryMaterial = require('../models/LibraryMaterial');
const StudyMaterial  = require('../models/StudyMaterial');
const Article        = require('../models/Article');
const ContactForm    = require('../models/ContactForm');
const AdmissionForm  = require('../models/AdmissionForm');

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalCourses, totalLibraryMaterials, totalStudyMaterials, totalArticles,
      totalContacts, totalAdmissions,
      pendingAdmissions, completedAdmissions,
      newContacts, resolvedContacts
    ] = await Promise.all([
      Course.countDocuments({ isActive: true }),
      LibraryMaterial.countDocuments({ isActive: true }),
      StudyMaterial.countDocuments({ isActive: true }),
      Article.countDocuments({ isPublished: true }),
      ContactForm.countDocuments({}),
      AdmissionForm.countDocuments({}),
      AdmissionForm.countDocuments({ status: 'pending' }),
      AdmissionForm.countDocuments({ status: 'complete' }),
      ContactForm.countDocuments({ status: 'new' }),
      ContactForm.countDocuments({ status: 'resolved' }),
    ]);

    // Last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [recentContacts, recentAdmissions] = await Promise.all([
      ContactForm.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      AdmissionForm.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCourses,
        totalLibraryMaterials,
        totalStudyMaterials,
        totalArticles,
        totalContacts,
        totalAdmissions,
        pendingAdmissions,
        completedAdmissions,
        newContacts,
        resolvedContacts,
        recentContacts,
        recentAdmissions,
        // For dashboard stat cards
        totalStudents: totalAdmissions,
      }
    });
  } catch (error) {
    console.error('[Admin] getDashboardStats error:', error);
    res.status(500).json({ success: false, error: 'Server error while fetching dashboard stats' });
  }
};

// @desc    Get recent activity
// @route   GET /api/admin/recent-activity
// @access  Private/Admin
const getRecentActivity = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const [recentContacts, recentAdmissions] = await Promise.all([
      ContactForm.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name email subject status createdAt'),
      AdmissionForm.find()
        .populate('courseId', 'title')
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name email courseId status createdAt')
    ]);

    const activities = [
      ...recentContacts.map(c => ({
        id: c._id, type: 'contact',
        description: `${c.name} sent a contact message: "${c.subject}"`,
        name: c.name, email: c.email,
        status: c.status, createdAt: c.createdAt
      })),
      ...recentAdmissions.map(a => ({
        id: a._id, type: 'admission',
        description: `${a.name} applied for ${a.courseId?.title || 'a course'}`,
        name: a.name, email: a.email,
        courseTitle: a.courseId?.title, status: a.status, createdAt: a.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
     .slice(0, limit);

    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error while fetching recent activity' });
  }
};

module.exports = { getDashboardStats, getRecentActivity };
