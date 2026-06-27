const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const LibraryMaterial = require('../models/LibraryMaterial');
const path = require('path');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to Atlas.');

    const uploadFile = async (filePath) => {
      console.log('Uploading', filePath, 'to Cloudinary...');
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          filePath,
          { folder: 'quran_academy/library', resource_type: 'raw' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
      });
    };

    // 1. Upload Nahjul-Balagha
    const nahjulUrl = await uploadFile(path.join(__dirname, '../uploads/Nahjul-Balagha English-1757186275289-7650263_compressed.pdf'));
    await LibraryMaterial.create({
      title: 'Nahjul-Balagha English',
      description: 'Nahjul-Balagha in English',
      category: 'books',
      fileUrl: nahjulUrl,
      fileType: 'pdf',
      fileSize: '9.6 MB'
    });
    console.log('Created Nahjul-Balagha in DB.');

    // 2. Upload Urdu Bible
    const bibleUrl = await uploadFile(path.join(__dirname, '../uploads/urdu bible OldTestament-1765108549293-722973331_compressed-compressed.pdf'));
    await LibraryMaterial.create({
      title: 'Urdu Bible Old Testament',
      description: 'Urdu Bible Old Testament',
      category: 'books',
      fileUrl: bibleUrl,
      fileType: 'pdf',
      fileSize: '9.4 MB'
    });
    console.log('Created Urdu Bible in DB.');

    // 3. Sahih Bukhari Vol 1
    await LibraryMaterial.create({
      title: 'Sahih Bukhari Volume 1',
      description: 'Sahih Bukhari Volume 1',
      category: 'books',
      fileUrl: 'https://drive.google.com/file/d/15_jBU0t69EqO-oje-Le4NDNsxTi74rCw/view?usp=sharing',
      fileType: 'link',
      fileSize: 'External'
    });
    console.log('Created Sahih Bukhari Vol 1 in DB.');

    // 4. Sahih Bukhari Vol 2
    await LibraryMaterial.create({
      title: 'Sahih Bukhari Volume 2',
      description: 'Sahih Bukhari Volume 2',
      category: 'books',
      fileUrl: 'https://drive.google.com/file/d/1de_Heq3LpkyhGYkiCbgLHiJ1GVv43B1K/view?usp=sharing',
      fileType: 'link',
      fileSize: 'External'
    });
    console.log('Created Sahih Bukhari Vol 2 in DB.');

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
