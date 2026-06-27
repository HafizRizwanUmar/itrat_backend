const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  instructor: {
    type: String,
    required: [true, 'Instructor name is required'],
    trim: true,
    maxlength: [100, 'Instructor name cannot exceed 100 characters']
  },
  duration: {
    type: String,
    required: [true, 'Course duration is required'],
    trim: true
  },
  level: {
    type: String,
    required: [true, 'Course level is required'],
    enum: ['beginner', 'intermediate', 'advanced'],
    lowercase: true
  },
  price: {
    type: Number,
    required: [true, 'Course price is required'],
    min: [0, 'Price cannot be negative']
  },
  // `image` is the frontend-facing field name
  image: {
    type: String,
    trim: true
  },
  // Keep imageUrl as alias for backward compat
  imageUrl: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  syllabus: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual: always return `image` from either field
courseSchema.virtual('_image').get(function() {
  return this.image || this.imageUrl || null;
});

// Ensure `image` is always set from whichever field is populated
courseSchema.pre('save', function(next) {
  if (this.imageUrl && !this.image) this.image = this.imageUrl;
  if (this.image && !this.imageUrl) this.imageUrl = this.image;
  next();
});

courseSchema.index({ title: 'text', description: 'text', instructor: 'text' });

module.exports = mongoose.model('Course', courseSchema);
