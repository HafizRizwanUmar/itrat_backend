/**
 * ═══════════════════════════════════════════════════════════════
 *  MIGRATION SCRIPT
 *  1. Export local MongoDB → MongoDB Atlas
 *  2. Upload local files (uploads/) → Cloudinary
 *  3. Update all MongoDB documents to use Cloudinary URLs
 *
 *  Run:  node scripts/migrate.js
 * ═══════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// ── Models ────────────────────────────────────────────────────
const Course         = require('../models/Course');
const Article        = require('../models/Article');
const LibraryMaterial = require('../models/LibraryMaterial');
const StudyMaterial  = require('../models/StudyMaterial');
const User           = require('../models/User');
const AdmissionForm  = require('../models/AdmissionForm');
const ContactForm    = require('../models/ContactForm');

// ── Cloudinary config (uses .env values) ─────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ── Connection URIs ───────────────────────────────────────────
const LOCAL_URI = 'mongodb://localhost:27017/quran_o_itrat_academy';
const ATLAS_URI = process.env.MONGODB_URI; // Atlas URI from .env

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Upload a single local file to Cloudinary. Returns the secure_url or null. */
async function uploadToCloudinary(localFilePath, folder) {
  try {
    const ext = path.extname(localFilePath).toLowerCase();
    // Determine resource type
    const imageExts  = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const videoExts  = ['.mp4', '.mov', '.avi', '.mkv'];
    let resourceType = 'raw'; // default: PDFs, XLSX, etc.
    if (imageExts.includes(ext)) resourceType = 'image';
    if (videoExts.includes(ext)) resourceType = 'video';

    const result = await cloudinary.uploader.upload(localFilePath, {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    console.error(`   ✗ Cloudinary upload failed for ${localFilePath}: ${err.message}`);
    return null;
  }
}

/** Resolve a local URL like /uploads/courses/x.jpg → absolute path */
function resolveLocalPath(urlOrPath) {
  if (!urlOrPath) return null;
  // Already absolute path
  if (path.isAbsolute(urlOrPath)) return urlOrPath;
  // URL like /uploads/courses/image.jpg  or  http://localhost:5000/uploads/...
  let relative = urlOrPath
    .replace(BACKEND_URL, '')   // strip backend URL if present
    .replace(/^\/+/, '');       // strip leading slashes
  return path.join(__dirname, '..', relative);
}

/** Check if a path points to a local file (not already a Cloudinary URL) */
function isLocalPath(urlOrPath) {
  if (!urlOrPath) return false;
  if (urlOrPath.includes('res.cloudinary.com')) return false;
  if (urlOrPath.startsWith('http') && !urlOrPath.includes('localhost')) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────
// STEP 1 — Export local MongoDB → Atlas
// ─────────────────────────────────────────────────────────────
async function migrateMongoData() {
  console.log('\n══════════════════════════════════════════════');
  console.log(' STEP 1: MongoDB Local → Atlas Migration');
  console.log('══════════════════════════════════════════════');

  // Connect to LOCAL MongoDB
  console.log('\n⏳ Connecting to LOCAL MongoDB...');
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('✅ Connected to local MongoDB');

  // Connect to ATLAS MongoDB
  console.log('⏳ Connecting to MongoDB Atlas...');
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log('✅ Connected to MongoDB Atlas');

  // Collections to migrate
  const collections = [
    'users',
    'courses',
    'articles',
    'librarymaterials',
    'studymaterials',
    'admissionforms',
    'contactforms',
  ];

  const stats = {};

  for (const collName of collections) {
    try {
      const localCol = localConn.collection(collName);
      const atlasCol = atlasConn.collection(collName);

      const docs = await localCol.find({}).toArray();
      if (docs.length === 0) {
        console.log(`   ⚠  ${collName}: empty — skipped`);
        stats[collName] = 0;
        continue;
      }

      // Upsert each doc by _id so re-running is safe
      let inserted = 0;
      for (const doc of docs) {
        await atlasCol.replaceOne({ _id: doc._id }, doc, { upsert: true });
        inserted++;
      }
      console.log(`   ✅ ${collName}: ${inserted} document(s) migrated`);
      stats[collName] = inserted;
    } catch (err) {
      // Collection may not exist locally — that's fine
      console.log(`   ⚠  ${collName}: ${err.message}`);
      stats[collName] = 'error';
    }
  }

  await localConn.close();
  await atlasConn.close();

  console.log('\n📊 MongoDB Migration Summary:');
  for (const [col, count] of Object.entries(stats)) {
    console.log(`   ${col}: ${count}`);
  }
}

// ─────────────────────────────────────────────────────────────
// STEP 2 — Upload local files → Cloudinary
// ─────────────────────────────────────────────────────────────
async function migrateFilesToCloudinary() {
  console.log('\n══════════════════════════════════════════════');
  console.log(' STEP 2: Local Files → Cloudinary Upload');
  console.log('══════════════════════════════════════════════');

  // Map of folder relative path → cloudinary folder name
  const folderMap = {
    'courses':         'quran_academy/courses',
    'articles':        'quran_academy/articles',
    'library':         'quran_academy/library',
    'study-materials': 'quran_academy/study_materials',
    '':                'quran_academy/misc',  // root uploads dir
  };

  // Collect all files
  const fileMap = {}; // localAbsPath → cloudinary URL

  for (const [localFolder, cloudFolder] of Object.entries(folderMap)) {
    const dirPath = localFolder
      ? path.join(UPLOADS_DIR, localFolder)
      : UPLOADS_DIR;

    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f =>
      fs.statSync(path.join(dirPath, f)).isFile()
    );

    if (files.length === 0) {
      console.log(`   ⚠  uploads/${localFolder || '(root)'}: empty — skipped`);
      continue;
    }

    console.log(`\n📁 Uploading uploads/${localFolder || '(root)'} → Cloudinary:/${cloudFolder}`);

    for (const file of files) {
      const localAbs = path.join(dirPath, file);
      console.log(`   ⏳ ${file}`);
      const result = await uploadToCloudinary(localAbs, cloudFolder);
      if (result) {
        fileMap[localAbs] = result.url;
        console.log(`   ✅ ${file} → ${result.url}`);
      }
    }
  }

  return fileMap;
}

// ─────────────────────────────────────────────────────────────
// STEP 3 — Update MongoDB Atlas documents to use Cloudinary URLs
// ─────────────────────────────────────────────────────────────
async function updateDocumentUrls(fileMap) {
  console.log('\n══════════════════════════════════════════════');
  console.log(' STEP 3: Update Atlas Documents → Cloudinary URLs');
  console.log('══════════════════════════════════════════════');

  await mongoose.connect(ATLAS_URI);
  console.log('✅ Connected to Atlas for URL updates');

  let updated = 0;

  // ── Courses: image / imageUrl ──────────────────────────────
  const courses = await Course.find({});
  for (const course of courses) {
    let changed = false;
    for (const field of ['image', 'imageUrl']) {
      const val = course[field];
      if (isLocalPath(val)) {
        const absPath = resolveLocalPath(val);
        const newUrl = fileMap[absPath];
        if (newUrl) {
          course[field] = newUrl;
          changed = true;
        }
      }
    }
    if (changed) {
      await course.save();
      updated++;
      console.log(`   ✅ Course "${course.title}" image updated`);
    }
  }

  // ── Articles: featuredImage ───────────────────────────────
  const articles = await Article.find({});
  for (const article of articles) {
    const val = article.featuredImage;
    if (isLocalPath(val)) {
      const absPath = resolveLocalPath(val);
      const newUrl = fileMap[absPath];
      if (newUrl) {
        article.featuredImage = newUrl;
        await article.save();
        updated++;
        console.log(`   ✅ Article "${article.title}" image updated`);
      }
    }
  }

  // ── LibraryMaterials: fileUrl ─────────────────────────────
  const libraryItems = await LibraryMaterial.find({});
  for (const item of libraryItems) {
    const val = item.fileUrl;
    if (isLocalPath(val)) {
      const absPath = resolveLocalPath(val);
      const newUrl = fileMap[absPath];
      if (newUrl) {
        item.fileUrl = newUrl;
        await item.save();
        updated++;
        console.log(`   ✅ LibraryMaterial "${item.title}" fileUrl updated`);
      }
    }
  }

  // ── StudyMaterials: filePath / fileUrl ────────────────────
  const studyMaterials = await StudyMaterial.find({});
  for (const sm of studyMaterials) {
    let changed = false;
    for (const field of ['filePath', 'fileUrl']) {
      const val = sm[field];
      if (isLocalPath(val)) {
        const absPath = resolveLocalPath(val);
        const newUrl = fileMap[absPath];
        if (newUrl) {
          sm[field] = newUrl;
          changed = true;
        }
      }
    }
    if (changed) {
      await sm.save();
      updated++;
      console.log(`   ✅ StudyMaterial "${sm.title}" URL updated`);
    }
  }

  await mongoose.disconnect();
  console.log(`\n📊 Total documents updated: ${updated}`);
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Starting full migration...\n');
  console.log(`   Local MongoDB : ${LOCAL_URI}`);
  console.log(`   Atlas URI     : ${ATLAS_URI?.replace(/:([^@]+)@/, ':****@')}`);
  console.log(`   Cloudinary    : ${process.env.CLOUDINARY_CLOUD_NAME}`);

  try {
    // ── Check if local MongoDB is running ──────────────────
    console.log('\n⏳ Checking local MongoDB availability...');
    const testConn = mongoose.createConnection(LOCAL_URI, { serverSelectionTimeoutMS: 3000 });
    let localAvailable = false;
    try {
      await testConn.asPromise();
      await testConn.close();
      localAvailable = true;
      console.log('✅ Local MongoDB is running');
    } catch {
      console.log('⚠  Local MongoDB is NOT running — skipping MongoDB data migration');
      console.log('   (Files will still be uploaded to Cloudinary and Atlas URLs updated)');
    }

    // STEP 1: Migrate Mongo data only if local DB is available
    if (localAvailable) {
      await migrateMongoData();
    }

    // STEP 2: Upload files to Cloudinary (always runs)
    const fileMap = await migrateFilesToCloudinary();

    // STEP 3: Update Atlas document URLs (always runs)
    if (Object.keys(fileMap).length > 0) {
      await updateDocumentUrls(fileMap);
    } else {
      console.log('\n⚠  No files were uploaded to Cloudinary — skipping URL updates');
    }

    console.log('\n══════════════════════════════════════════════');
    console.log(' ✅ MIGRATION COMPLETE');
    console.log('══════════════════════════════════════════════\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
