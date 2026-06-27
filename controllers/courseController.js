const Course = require('../models/Course');
const path = require('path');

// Helper — normalize course so `image` is always present for the frontend
const normalize = (course) => {
  if (!course) return course;
  const obj = course.toObject ? course.toObject() : { ...course };
  
  // Prefer `image`, fall back to `imageUrl`
  let img = obj.image || obj.imageUrl || null;
  
  // Prepend BACKEND_URL if it's a relative path
  const backendUrl = process.env.BACKEND_URL || '';
  if (img && img.startsWith('/uploads') && backendUrl) {
    img = `${backendUrl.replace(/\/$/, '')}${img}`;
  }
  
  obj.image = img;
  return obj;
};

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
const getCourses = async (req, res) => {
  try {
    const { level, category, search, page = 1, limit = 10 } = req.query;
    let query = { isActive: true };
    if (level) query.level = level;
    if (category) query.category = { $regex: category, $options: 'i' };
    if (search) {
      // Fallback to regex if text index not set up
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { instructor: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      count: courses.length,
      total,
      pagination: { page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
      data: courses.map(normalize)
    });
  } catch (error) {
    console.error('[Courses] getCourses error:', error);
    res.status(500).json({ success: false, error: 'Server error while fetching courses' });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
const getCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, isActive: true });
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
    res.status(200).json({ success: true, data: normalize(course) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error while fetching course' });
  }
};

// @desc    Create course
// @route   POST /api/courses
// @access  Private/Admin
const createCourse = async (req, res) => {
  try {
    const courseData = { ...req.body };

    // Handle image upload — store path in both `image` and `imageUrl`
    if (req.file) {
      const imagePath = `/uploads/courses/${req.file.filename}`;
      courseData.image    = imagePath;
      courseData.imageUrl = imagePath;
    }

    // Parse syllabus if sent as JSON string
    if (courseData.syllabus && typeof courseData.syllabus === 'string') {
      try { courseData.syllabus = JSON.parse(courseData.syllabus); } catch (_) {
        courseData.syllabus = courseData.syllabus.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const course = await Course.create(courseData);
    res.status(201).json({ success: true, data: normalize(course) });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message).join(', ');
      return res.status(400).json({ success: false, error: message });
    }
    console.error('[Courses] createCourse error:', error);
    res.status(500).json({ success: false, error: 'Server error while creating course' });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Admin
const updateCourse = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      const imagePath = `/uploads/courses/${req.file.filename}`;
      updateData.image    = imagePath;
      updateData.imageUrl = imagePath;
    }

    if (updateData.syllabus && typeof updateData.syllabus === 'string') {
      try { updateData.syllabus = JSON.parse(updateData.syllabus); } catch (_) {
        updateData.syllabus = updateData.syllabus.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

    res.status(200).json({ success: true, data: normalize(course) });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message).join(', ');
      return res.status(400).json({ success: false, error: message });
    }
    res.status(500).json({ success: false, error: 'Server error while updating course' });
  }
};

// @desc    Delete course (soft delete)
// @route   DELETE /api/courses/:id
// @access  Private/Admin
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
    res.status(200).json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error while deleting course' });
  }
};

module.exports = { getCourses, getCourse, createCourse, updateCourse, deleteCourse };
