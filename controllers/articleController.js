const Article = require('../models/Article');

// Helper — normalize article so URLs are absolute for the frontend
const normalize = (article) => {
  if (!article) return article;
  const obj = article.toObject ? article.toObject() : { ...article };
  const backendUrl = process.env.BACKEND_URL || '';
  
  if (obj.featuredImage && obj.featuredImage.startsWith('/uploads') && backendUrl) {
    obj.featuredImage = `${backendUrl.replace(/\/$/, '')}${obj.featuredImage}`;
  }
  
  return obj;
};

// @desc    Get all articles
// @route   GET /api/articles
// @access  Public
const getArticles = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    
    let query = { isPublished: true };
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }
    
    const articles = await Article.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Article.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: articles.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: articles.map(normalize)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error while fetching articles'
    });
  }
};

// @desc    Get single article
// @route   GET /api/articles/:id
// @access  Public
const getArticle = async (req, res) => {
  try {
    console.log(`[Articles] Fetching article with ID: ${req.params.id}`);
    const article = await Article.findOne({ _id: req.params.id, isPublished: true });
    
    if (!article) {
      console.log(`[Articles] Article not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }
    
    // Increment view count
    await Article.findByIdAndUpdate(req.params.id, {
      $inc: { views: 1 }
    });
    
    res.status(200).json({
      success: true,
      data: normalize(article)
    });
  } catch (error) {
    console.error(`[Articles] Error fetching article ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching article'
    });
  }
};

// @desc    Create article
// @route   POST /api/articles
// @access  Private/Admin
const createArticle = async (req, res) => {
  try {
    const articleData = { ...req.body };
    if (req.file) {
      articleData.featuredImage = `/uploads/articles/${req.file.filename}`;
    }
    if (req.body.tags && typeof req.body.tags === 'string') {
      try {
        articleData.tags = JSON.parse(req.body.tags);
      } catch (e) {
        // Fallback or leave as is if not valid JSON
      }
    }
    
    const article = await Article.create(articleData);
    
    res.status(201).json({
      success: true,
      data: normalize(article)
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message).join(', ');
      return res.status(400).json({
        success: false,
        error: message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server error while creating article'
    });
  }
};

// @desc    Update article
// @route   PUT /api/articles/:id
// @access  Private/Admin
const updateArticle = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.featuredImage = `/uploads/articles/${req.file.filename}`;
    }
    if (req.body.tags && typeof req.body.tags === 'string') {
      try {
        updateData.tags = JSON.parse(req.body.tags);
      } catch (e) {
        // Fallback
      }
    }

    const article = await Article.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: normalize(article)
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message).join(', ');
      return res.status(400).json({
        success: false,
        error: message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server error while updating article'
    });
  }
};

// @desc    Delete article (soft delete)
// @route   DELETE /api/articles/:id
// @access  Private/Admin
const deleteArticle = async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { isPublished: false },
      { new: true }
    );
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error while deleting article'
    });
  }
};

module.exports = {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle
};
