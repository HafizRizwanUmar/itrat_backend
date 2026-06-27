const LibraryMaterial = require('../models/LibraryMaterial');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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

// @desc    Get all library materials
// @route   GET /api/library
// @access  Public
const getLibraryMaterials = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    
    let query = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    const materials = await LibraryMaterial.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await LibraryMaterial.countDocuments(query);
    
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
    console.error('Error fetching materials:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching library materials'
    });
  }
};

// @desc    Get single library material
// @route   GET /api/library/:id
// @access  Public
const getLibraryMaterial = async (req, res) => {
  try {
    const material = await LibraryMaterial.findOne({ _id: req.params.id, isActive: true });
    
    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Library material not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: normalize(material)
    });
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching library material'
    });
  }
};

// @desc    Download library material
// @route   GET /api/library/:id/download
// @access  Public
const downloadLibraryMaterial = async (req, res) => {
  try {
    const material = await LibraryMaterial.findOne({ _id: req.params.id, isActive: true });
    
    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Library material not found'
      });
    }

    // Update download count
    await LibraryMaterial.findByIdAndUpdate(req.params.id, {
      $inc: { downloadCount: 1 }
    });

    // External link (Google Drive etc.)
    if (material.externalLink) {
      return res.redirect(material.externalLink);
    }

    // Cloudinary or absolute URL
    if (material.fileUrl && (material.fileUrl.startsWith('http://') || material.fileUrl.startsWith('https://'))) {
      return res.redirect(material.fileUrl);
    }
    
    // Local file (legacy)
    const filePath = path.join(__dirname, '..', material.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found on server' });
    }
    const filename = `${material.title}.${material.fileType}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) res.status(500).json({ success: false, error: 'Error downloading file' });
    });
  } catch (error) {
    console.error('Error downloading material:', error);
    res.status(500).json({ success: false, error: 'Server error while downloading material' });
  }
};

// @desc    Create library material
// @route   POST /api/library
// @access  Private/Admin
const createLibraryMaterial = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    const { title, description, category, author, externalLink } = req.body;

    if (!title || title.trim() === '') return res.status(400).json({ success: false, error: 'Title is required' });
    if (!description || description.trim() === '') return res.status(400).json({ success: false, error: 'Description is required' });
    if (!category || category.trim() === '') return res.status(400).json({ success: false, error: 'Category is required' });

    const allowedCategories = ['books', 'audio', 'video', 'documents'];
    if (!allowedCategories.includes(category.toLowerCase())) {
      return res.status(400).json({ success: false, error: `Invalid category. Allowed: ${allowedCategories.join(', ')}` });
    }

    let materialData;

    if (externalLink && externalLink.trim()) {
      // External link mode (Google Drive etc.)
      materialData = {
        title: title.trim(),
        description: description.trim(),
        category: category.toLowerCase(),
        author: author ? author.trim() : '',
        externalLink: externalLink.trim(),
        fileType: 'link',
        fileSize: 'External'
      };
    } else {
      // File upload mode
      if (!req.file) return res.status(400).json({ success: false, error: 'A file or external link is required' });

      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      const fileType = fileExtension.replace('.', '');
      const allowedFileTypes = ['pdf', 'doc', 'docx', 'mp3', 'mp4', 'avi', 'mov'];
      if (!allowedFileTypes.includes(fileType)) {
        try { fs.unlinkSync(req.file.path); } catch(e) {}
        return res.status(400).json({ success: false, error: `Invalid file type. Allowed: ${allowedFileTypes.join(', ')}` });
      }

      materialData = {
        title: title.trim(),
        description: description.trim(),
        category: category.toLowerCase(),
        author: author ? author.trim() : '',
        fileUrl: `/uploads/${req.file.filename}`,
        fileType,
        fileSize: (req.file.size / 1024 / 1024).toFixed(2) + ' MB'
      };
    }

    const material = await LibraryMaterial.create(materialData);
    res.status(201).json({ success: true, data: normalize(material) });
  } catch (error) {
    console.error('Error in createLibraryMaterial:', error);
    if (req.file && req.file.path) { try { fs.unlinkSync(req.file.path); } catch(e) {} }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: Object.values(error.errors).map(v => v.message).join(', ') });
    }
    res.status(500).json({ success: false, error: 'Server error while creating library material' });
  }
};

// @desc    Update library material
// @route   PUT /api/library/:id
// @access  Private/Admin
const updateLibraryMaterial = async (req, res) => {
  try {
    const material = await LibraryMaterial.findByIdAndUpdate(
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
        error: 'Library material not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: normalize(material)
    });
  } catch (error) {
    console.error('Error updating material:', error);
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message).join(', ');
      return res.status(400).json({
        success: false,
        error: message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server error while updating library material'
    });
  }
};

// @desc    Delete library material (soft delete)
// @route   DELETE /api/library/:id
// @access  Private/Admin
const deleteLibraryMaterial = async (req, res) => {
  try {
    const material = await LibraryMaterial.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Library material not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Library material deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting library material'
    });
  }
};

module.exports = {
  getLibraryMaterials,
  getLibraryMaterial,
  downloadLibraryMaterial,
  createLibraryMaterial,
  updateLibraryMaterial,
  deleteLibraryMaterial
};

