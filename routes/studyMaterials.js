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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/study-materials');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

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

