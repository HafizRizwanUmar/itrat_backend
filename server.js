const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const rateLimit = require('express-rate-limit');
const path     = require('path');
const fs       = require('fs');
require('dotenv').config();

const connectDB      = require('./config/database');
const errorHandler   = require('./middleware/errorHandler');

// Route imports
const authRoutes         = require('./routes/auth');
const courseRoutes       = require('./routes/courses');
const libraryRoutes      = require('./routes/library');
const studyMaterialRoutes = require('./routes/studyMaterials');
const articleRoutes      = require('./routes/articles');
const contactRoutes      = require('./routes/contact');
const admissionRoutes    = require('./routes/admission');
const adminRoutes        = require('./routes/admin');

// Ensure upload directories exist
['uploads', 'uploads/courses', 'uploads/library', 'uploads/study-materials'].forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

// Connect to database
connectDB();

const app = express();

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // allow images to be loaded by browser
}));

// ── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Stricter limit on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many login attempts, please try again later.' }
});
app.use('/api/auth', authLimiter);

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGINS || '*').split(',').map(o => o.trim()).filter(Boolean)
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173'
    ];

app.use(cors({
  origin: (origin, cb) => {
    // Allow no-origin requests (Postman, curl, server-to-server)
    if (!origin) return cb(null, true);
    // If wildcard set, allow all
    if (allowedOrigins.includes('*')) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Static files (uploads) ───────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true
}));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/courses',        courseRoutes);
app.use('/api/library',        libraryRoutes);
app.use('/api/study-materials', studyMaterialRoutes);
app.use('/api/articles',       articleRoutes);
app.use('/api/contact',        contactRoutes);
app.use('/api/admission',      admissionRoutes);
app.use('/api/admin',          adminRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Quran O Itrat Academy API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// ── Serve frontend build in production ───────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
  }
}

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server (skip on Vercel serverless) ─────────────────────────────────
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🕌  Quran O Itrat Academy API`);
    console.log(`   ├─ Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   ├─ Port: ${PORT}`);
    console.log(`   └─ URL:  http://localhost:${PORT}/api/health\n`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('[Server] Unhandled rejection:', err.message);
    server.close(() => process.exit(1));
  });
}

module.exports = app;
