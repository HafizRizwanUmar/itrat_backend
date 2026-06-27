const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getStudyMaterials,
  getStudyMaterial,
  downloadStudyMaterial,
  createStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial
} = require('../controllers/studyMaterialController');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads in memory
const storage = multer.memoryStorage();

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, XLS, XLSX files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Routes
router.route('/')
  .get(getStudyMaterials)
  .post(adminAuth, upload.single('file'), createStudyMaterial);

router.get('/:id/download', downloadStudyMaterial);

router.route('/:id')
  .get(getStudyMaterial)
  .put(adminAuth, updateStudyMaterial)
  .delete(adminAuth, deleteStudyMaterial);

module.exports = router;

