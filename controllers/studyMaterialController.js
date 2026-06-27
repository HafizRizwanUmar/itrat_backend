const StudyMaterial = require('../models/StudyMaterial');
const path = require('path');
const fs = require('fs');

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to get file type from mimetype
const getFileTypeFromMime = (mimetype) => {
  const mimeToType = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
  };
  return mimeToType[mimetype] || 'unknown';
};

// Helper function to get MIME type from file extension
const getMimeTypeFromExtension = (extension) => {
  const extToMime = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  return extToMime[extension.toLowerCase()] || 'application/octet-stream';
};

// Helper — normalize material so URLs are absolute for the frontend
const normalize = (material) => {
  if (!material) return material;
  const obj = material.toObject ? material.toObject() : { ...material };
  const backendUrl = process.env.BACKEND_URL || '';
  
  if (obj.fileUrl && obj.fileUrl.startsWith('/uploads') && backendUrl) {
    obj.fileUrl = `${backendUrl.replace(/\/$/, '')}${obj.fileUrl}`;
  }
  
  return obj;
};

// @desc    Get all study materials
// @route   GET /api/study-materials
// @access  Public
const getStudyMaterials = async (req, res) => {
  try {
    const { courseId, search, page = 1, limit = 10 } = req.query;
    
    let query = { isActive: true };
    
    // Filter by course
    if (courseId) {
      query.courseId = courseId;
    }
    
    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }
    
    const materials = await StudyMaterial.find(query)
      .populate('courseId', 'title instructor')
      .sort({ lessonNumber: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await StudyMaterial.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: materials.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: materials.map(normalize)
    });
  } catch (error) {
    console.error('Error fetching study materials:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching study materials'
    });
  }
};

// @desc    Get single study material
// @route   GET /api/study-materials/:id
// @access  Public
const getStudyMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findOne({ _id: req.params.id, isActive: true })
      .populate('courseId', 'title instructor');
    
    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Study material not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: normalize(material)
    });
  } catch (error) {
    console.error('Error fetching study material:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching study material'
    });
  }
};

// @desc    Download study material
// @route   GET /api/study-materials/:id/download
// @access  Public
const downloadStudyMaterial = async (req, res) => {
  try {
    console.log('Download request for material ID:', req.params.id);
    
    const material = await StudyMaterial.findOne({ _id: req.params.id, isActive: true });
    
    if (!material) {
      console.log('Material not found');
      return res.status(404).json({
        success: false,
        error: 'Study material not found'
      });
    }

    console.log('Material found:', {
      id: material._id,
      title: material.title,
      fileName: material.fileName,
      filePath: material.filePath,
      fileUrl: material.fileUrl
    });

    // Redirect to external link if set
    if (material.externalLink) {
      try {
        await StudyMaterial.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } });
      } catch(e) {}
      return res.redirect(material.externalLink);
    }

    // Handle both new file upload system and legacy URL system
    if (material.fileName && material.filePath) {
      // New file upload system
      let filePath = material.filePath;
      
      // If the stored filePath is not absolute, resolve it relative to the project root
      if (!path.isAbsolute(filePath)) {
        filePath = path.resolve(process.cwd(), filePath);
      }
      
      let actualFilePath = filePath;
      
      if (!fs.existsSync(actualFilePath)) {
        console.log("File not found at stored path. Attempting alternative paths.");
        // Fallback to common upload directories if the stored path doesn't exist
        const possibleFallbackPaths = [
          path.join(process.cwd(), 'uploads', 'study-materials', material.fileName),
          path.join(__dirname, '..', 'uploads', 'study-materials', material.fileName),
        ];

        for (const testPath of possibleFallbackPaths) {
          console.log('Checking fallback path:', testPath);
          if (fs.existsSync(testPath)) {
            actualFilePath = testPath;
            console.log('File found at fallback path:', actualFilePath);
            break;
          }
        }
      }
      
      if (!actualFilePath || !fs.existsSync(actualFilePath)) {
        console.log('File not found in any of the possible paths');
        return res.status(404).json({
          success: false,
          error: 'File not found on server. Please contact administrator.'
        });
      }

      // Increment download count BEFORE serving the file
      try {
        await StudyMaterial.findByIdAndUpdate(req.params.id, {
          $inc: { downloadCount: 1 }
        });
        console.log('Download count incremented for material:', req.params.id);
      } catch (updateError) {
        console.error('Error updating download count:', updateError);
        // Continue with download even if count update fails
      }

      // Get file stats
      const stat = fs.statSync(actualFilePath);
      const fileSize = stat.size;
      
      // Determine MIME type
      const fileExtension = path.extname(actualFilePath).substring(1);
      const mimeType = getMimeTypeFromExtension(fileExtension);
      
      // Set appropriate headers for file download
      const originalFileName = material.originalFileName || material.fileName;
      
      console.log('Serving file:', {
        path: actualFilePath,
        size: fileSize,
        mimeType: mimeType,
        originalFileName: originalFileName
      });
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Create read stream and pipe to response
      const fileStream = fs.createReadStream(actualFilePath);
      
      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Error reading file'
          });
        }
      });
      
      fileStream.on('end', () => {
        console.log('File download completed for:', originalFileName);
      });
      
      fileStream.pipe(res);
      
    } else if (material.fileUrl) {
      // Legacy URL system - increment count and redirect
      try {
        await StudyMaterial.findByIdAndUpdate(req.params.id, {
          $inc: { downloadCount: 1 }
        });
        console.log('Download count incremented for legacy material:', req.params.id);
      } catch (updateError) {
        console.error('Error updating download count for legacy material:', updateError);
      }
      
      console.log('Redirecting to legacy URL:', material.fileUrl);
      res.redirect(material.fileUrl);
    } else {
      console.log('No file or URL available for material:', req.params.id);
      return res.status(404).json({
        success: false,
        error: 'No file or URL available for download'
      });
    }
    
  } catch (error) {
    console.error('Error downloading material:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Server error while downloading material'
      });
    }
  }
};

// @desc    Create study material
// @route   POST /api/study-materials
// @access  Private/Admin
const createStudyMaterial = async (req, res) => {
  try {
    const { title, description, courseId, lessonNumber, externalLink } = req.body;

    if (!title || !description || !courseId) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Title, description, and course are required' });
    }

    let materialData;

    if (externalLink && externalLink.trim()) {
      // External link mode (Google Drive etc.)
      materialData = {
        title,
        description,
        courseId,
        externalLink: externalLink.trim(),
        fileType: 'link',
        fileSize: 'External',
        fileName: 'external-link',
        originalFileName: 'external-link',
        filePath: 'external-link',
        downloadCount: 0,
        ...(lessonNumber && { lessonNumber: parseInt(lessonNumber) })
      };
    } else {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded and no external link provided' });

      const fileSize = formatFileSize(req.file.size);
      const fileType = getFileTypeFromMime(req.file.mimetype);
      const fileName = req.file.filename;
      const originalFileName = req.file.originalname;

      materialData = {
        title,
        description,
        courseId,
        fileName,
        originalFileName,
        fileType,
        fileSize,
        filePath: req.file.path,
        downloadCount: 0,
        ...(lessonNumber && { lessonNumber: parseInt(lessonNumber) })
      };
    }

    const material = await StudyMaterial.create(materialData);
    console.log('Study material created successfully:', material._id);
    res.status(201).json({ success: true, data: normalize(material) });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Error creating study material:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: Object.values(error.errors).map(v => v.message).join(', ') });
    }
    res.status(500).json({ success: false, error: 'Server error while creating study material' });
  }
};

// @desc    Update study material
// @route   PUT /api/study-materials/:id
// @access  Private/Admin
const updateStudyMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Study material not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: normalize(material)
    });
  } catch (error) {
    console.error('Error updating study material:', error);
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message).join(', ');
      return res.status(400).json({
        success: false,
        error: message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server error while updating study material'
    });
  }
};

// @desc    Delete study material (soft delete)
// @route   DELETE /api/study-materials/:id
// @access  Private/Admin
const deleteStudyMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Study material not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Study material deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting study material:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting study material'
    });
  }
};

module.exports = {
  getStudyMaterials,
  getStudyMaterial,
  downloadStudyMaterial,
  createStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial
};

