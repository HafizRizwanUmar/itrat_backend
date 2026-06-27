const express = require('express');
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/courseController');
const { adminAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for memory uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload only images.'), false);
    }
  }
});

const router = express.Router();

router.route('/')
  .get(getCourses)
  .post(adminAuth, upload.single('image'), createCourse);

router.route('/:id')
  .get(getCourse)
  .put(adminAuth, upload.single('image'), updateCourse)
  .delete(adminAuth, deleteCourse);

module.exports = router;
