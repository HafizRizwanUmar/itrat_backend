const mongoose = require('mongoose');

const admissionFormSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course selection is required']
  },
  age: {
    type: Number,
    min: [5, 'Age must be at least 5'],
    max: [100, 'Age cannot exceed 100']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    lowercase: true
  },
  educationLevel: {
    type: String,
    trim: true,
    maxlength: [100, 'Education level cannot exceed 100 characters']
  },
  previousExperience: {
    type: String,
    trim: true,
    maxlength: [1000, 'Previous experience cannot exceed 1000 characters']
  },
  motivation: {
    type: String,
    trim: true,
    maxlength: [1000, 'Motivation cannot exceed 1000 characters']
  },
  guardianName: {
    type: String,
    trim: true,
    maxlength: [100, 'Guardian name cannot exceed 100 characters']
  },
  message: {
    type: String,
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  // Extended status: pending | complete | incomplete
  status: {
    type: String,
    enum: ['pending', 'complete', 'incomplete'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdmissionForm', admissionFormSchema);
