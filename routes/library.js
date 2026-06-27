const express = require("express");
const {
  getLibraryMaterials,
  getLibraryMaterial,
  downloadLibraryMaterial,
  createLibraryMaterial,
  updateLibraryMaterial,
  deleteLibraryMaterial
} = require("../controllers/libraryController");
const { adminAuth } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads in memory
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB limit (increased from 10MB)
    files: 1 // Only allow 1 file
  },
  fileFilter: (req, file, cb) => {
    console.log("Multer fileFilter: File being processed:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Define allowed file types and their corresponding MIME types
    const allowedTypes = {
      "pdf": ["application/pdf"],
      "doc": ["application/msword"],
      "docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      "mp3": ["audio/mpeg", "audio/mp3"],
      "mp4": ["video/mp4"],
      "avi": ["video/x-msvideo", "video/avi"],
      "mov": ["video/quicktime"]
    };

    const fileExtension = path.extname(file.originalname).toLowerCase().replace(".", "");
    const allowedMimeTypes = allowedTypes[fileExtension];

    if (!allowedMimeTypes) {
      return cb(new Error(`Invalid file type. File extension '${fileExtension}' is not allowed. Allowed types: ${Object.keys(allowedTypes).join(", ")}`));
    }

    // Check if MIME type matches the file extension
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`File MIME type '${file.mimetype}' does not match the file extension '${fileExtension}'`));
    }

    cb(null, true);
  },
}).single("file");

const router = express.Router();

// Enhanced multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  console.error("Multer error caught by handleMulterError:", err);
  
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          error: "File too large. Maximum size allowed is 50MB."
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          error: "Too many files. Only one file is allowed."
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          error: "Unexpected file field. Make sure the file field name is \"file\"."
        });
      default:
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`
        });
    }
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  next();
};

// Custom middleware to handle file upload with better error reporting
const uploadMiddleware = (req, res, next) => {
  console.log("uploadMiddleware: Starting file upload processing...");
  upload(req, res, (err) => {
    if (err) {
      console.error("uploadMiddleware: Error during Multer processing:", err);
      return handleMulterError(err, req, res, next);
    }
    
    // Log successful upload
    if (req.file) {
      console.log("uploadMiddleware: File processed successfully by Multer:", {
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      });
    } else {
      console.log("uploadMiddleware: No file was processed by Multer (req.file is undefined).");
    }
    
    next();
  });
};

router.route("/")
  .get(getLibraryMaterials)
  .post(adminAuth, uploadMiddleware, createLibraryMaterial);

router.get("/:id/download", downloadLibraryMaterial);

router.route("/:id")
  .get(getLibraryMaterial)
  .put(adminAuth, updateLibraryMaterial)
  .delete(adminAuth, deleteLibraryMaterial);

module.exports = router;