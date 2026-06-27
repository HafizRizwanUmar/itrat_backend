const mongoose = require('mongoose');

const libraryMaterialSchema = new mongoose.Schema({
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
  category: {
    type: String,
    required: [true, 'Material category is required'],
    enum: ['books', 'audio', 'video', 'documents'],
    lowercase: true
  },
  fileUrl: {
    type: String,
    trim: true
  },
  // External link (e.g. Google Drive) for files > 10MB
  externalLink: {
    type: String,
    trim: true
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    trim: true,
    lowercase: true
  },
  fileSize: {
    type: String,
    trim: true
  },
  author: {
    type: String,
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
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
libraryMaterialSchema.index({ title: 'text', description: 'text', author: 'text' });

module.exports = mongoose.model('LibraryMaterial', libraryMaterialSchema);