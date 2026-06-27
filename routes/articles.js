const express = require('express');
const {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle
} = require('../controllers/articleController');
const { adminAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/articles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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
  .get(getArticles)
  .post(adminAuth, upload.single('featuredImage'), createArticle);

router.route('/:id')
  .get(getArticle)
  .put(adminAuth, upload.single('featuredImage'), updateArticle)
  .delete(adminAuth, deleteArticle);

module.exports = router;
