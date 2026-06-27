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
  .get(getArticles)
  .post(adminAuth, upload.single('featuredImage'), createArticle);

router.route('/:id')
  .get(getArticle)
  .put(adminAuth, upload.single('featuredImage'), updateArticle)
  .delete(adminAuth, deleteArticle);

module.exports = router;
