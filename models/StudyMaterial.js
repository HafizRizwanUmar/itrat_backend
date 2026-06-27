const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Material title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Material description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  // File-related fields for uploaded files (optional when externalLink is provided)
  fileName: {
    type: String,
    trim: true
  },
  originalFileName: {
    type: String,
    trim: true
  },
  filePath: {
    type: String,
    trim: true
  },
  fileType: {
    type: String,
    trim: true,
    lowercase: true
  },
  fileSize: {
    type: String,
    trim: true
  },
  // External link (e.g. Google Drive) for files > 10MB
  externalLink: {
    type: String,
    trim: true
  },
  // Legacy / Cloudinary URL
  fileUrl: {
    type: String,
    trim: true
  },
  lessonNumber: {
    type: Number,
    min: [1, 'Lesson number must be at least 1']
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: [0, 'Download count cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for search functionality
studyMaterialSchema.index({ title: 'text', description: 'text' });

// Virtual for file URL (for API compatibility)
studyMaterialSchema.virtual('downloadUrl').get(function() {
  return `/api/study-materials/${this._id}/download`;
});

// Ensure virtual fields are serialized
studyMaterialSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);

