const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Course = require('../models/Course');
const LibraryMaterial = require('../models/LibraryMaterial');
const StudyMaterial = require('../models/StudyMaterial');
const Article = require('../models/Article');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Course.deleteMany({});
    await LibraryMaterial.deleteMany({});
    await StudyMaterial.deleteMany({});
    await Article.deleteMany({});

    console.log('Existing data cleared...');

    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@quranoitrat.com',
      password: 'admin123'
    });

    console.log('Admin user created (username: admin, password: admin123)');

    // Create sample courses
    const courses = await Course.create([
      {
        title: "Quran Recitation for Beginners",
        description: "Learn the basics of Quran recitation with proper Tajweed rules. This course is designed for complete beginners who want to start their journey of learning the Holy Quran.",
        instructor: "Qari Muhammad Ali",
        duration: "3 months",
        level: "beginner",
        price: 150,
        imageUrl: "/images/quran-recitation.jpg",
        syllabus: [
          "Arabic Alphabet and Pronunciation",
          "Basic Tajweed Rules",
          "Short Surahs Practice",
          "Daily Prayer Recitations"
        ]
      },
      {
        title: "Advanced Tajweed Course",
        description: "Master the advanced rules of Tajweed and perfect your Quran recitation. This course covers complex pronunciation rules and melodious recitation techniques.",
        instructor: "Qari Ahmad Hassan",
        duration: "6 months",
        level: "advanced",
        price: 300,
        imageUrl: "/images/tajweed-advanced.jpg",
        syllabus: [
          "Advanced Tajweed Rules",
          "Qiraat Variations",
          "Melodious Recitation",
          "Teaching Methodology"
        ]
      },
      {
        title: "Islamic Studies Foundation",
        description: "Comprehensive Islamic studies covering Aqeedah, Fiqh, and Islamic history. Perfect for students wanting to build a strong foundation in Islamic knowledge.",
        instructor: "Sheikh Abdullah Rahman",
        duration: "4 months",
        level: "intermediate",
        price: 200,
        imageUrl: "/images/islamic-studies.jpg",
        syllabus: [
          "Aqeedah (Islamic Beliefs)",
          "Fiqh (Islamic Jurisprudence)",
          "Seerah (Prophet's Biography)",
          "Islamic History"
        ]
      },
      {
        title: "Arabic Language Basics",
        description: "Learn Arabic language fundamentals to better understand the Quran and Islamic texts. This course focuses on grammar, vocabulary, and reading comprehension.",
        instructor: "Ustadh Omar Farouk",
        duration: "5 months",
        level: "beginner",
        price: 180,
        imageUrl: "/images/arabic-language.jpg",
        syllabus: [
          "Arabic Alphabet and Writing",
          "Basic Grammar Rules",
          "Vocabulary Building",
          "Reading Comprehension"
        ]
      }
    ]);

    console.log('Sample courses created...');

    // Create sample library materials
    await LibraryMaterial.create([
      {
        title: "Tafseer Ibn Kathir - Volume 1",
        description: "Classical commentary on the Quran by Ibn Kathir. This volume covers the first few chapters of the Quran with detailed explanations.",
        category: "books",
        fileUrl: "/files/tafseer-ibn-kathir-vol1.pdf",
        fileType: "pdf",
        fileSize: "15.2 MB",
        author: "Ibn Kathir"
      },
      {
        title: "Sahih Bukhari Collection",
        description: "Complete collection of authentic Hadith compiled by Imam Bukhari. Essential reference for Islamic studies.",
        category: "books",
        fileUrl: "/files/sahih-bukhari.pdf",
        fileType: "pdf",
        fileSize: "25.8 MB",
        author: "Imam Bukhari"
      },
      {
        title: "Beautiful Quran Recitation - Surah Al-Baqarah",
        description: "Melodious recitation of Surah Al-Baqarah by renowned Qari. Perfect for listening and memorization.",
        category: "audio",
        fileUrl: "/files/surah-baqarah-recitation.mp3",
        fileType: "mp3",
        fileSize: "45.6 MB",
        author: "Qari Abdul Rahman"
      },
      {
        title: "Islamic Calligraphy Guide",
        description: "Comprehensive guide to Islamic calligraphy with step-by-step instructions and practice sheets.",
        category: "documents",
        fileUrl: "/files/calligraphy-guide.pdf",
        fileType: "pdf",
        fileSize: "8.3 MB",
        author: "Master Calligrapher Hassan"
      }
    ]);

    console.log('Sample library materials created...');

    // Create sample study materials
    await StudyMaterial.create([
      {
        title: "Lesson 1: Arabic Alphabet",
        description: "Introduction to Arabic letters and their pronunciation",
        courseId: courses[3]._id, // Arabic Language Basics
        fileUrl: "/files/arabic-alphabet-lesson1.pdf",
        fileType: "pdf",
        fileSize: "2.1 MB",
        lessonNumber: 1
      },
      {
        title: "Lesson 2: Basic Tajweed Rules",
        description: "Fundamental rules of Tajweed for proper Quran recitation",
        courseId: courses[0]._id, // Quran Recitation for Beginners
        fileUrl: "/files/tajweed-basics-lesson2.pdf",
        fileType: "pdf",
        fileSize: "3.5 MB",
        lessonNumber: 2
      }
    ]);

    console.log('Sample study materials created...');

    // Create sample articles
    await Article.create([
      {
        title: "The Importance of Daily Quran Recitation",
        content: "Reading the Quran daily brings numerous spiritual and psychological benefits. This article explores the importance of making Quran recitation a daily habit and provides practical tips for maintaining consistency. The Holy Quran is not just a book to be read, but a guide for life that should be reflected upon and implemented in our daily lives.",
        author: "Dr. Fatima Al-Zahra",
        category: "Spiritual Guidance",
        tags: ["Quran", "Daily Practice", "Spirituality"],
        featuredImage: "/images/daily-quran.jpg"
      },
      {
        title: "Understanding Tajweed: The Art of Quran Recitation",
        content: "Tajweed is the art of reciting the Quran correctly and beautifully. This comprehensive guide explains the fundamental rules of Tajweed and why it's essential for every Muslim to learn proper pronunciation. We'll cover the basic rules, common mistakes, and provide resources for further learning.",
        author: "Qari Muhammad Yusuf",
        category: "Education",
        tags: ["Tajweed", "Recitation", "Learning"],
        featuredImage: "/images/tajweed-guide.jpg"
      },
      {
        title: "The Role of Islamic Education in Modern Society",
        content: "Islamic education plays a crucial role in shaping character and providing moral guidance in today's world. This article discusses how traditional Islamic teachings can be integrated with modern educational approaches to create well-rounded individuals who can contribute positively to society.",
        author: "Prof. Ahmad Malik",
        category: "Education",
        tags: ["Islamic Education", "Modern Society", "Character Building"],
        featuredImage: "/images/islamic-education.jpg"
      }
    ]);

    console.log('Sample articles created...');
    console.log('Database seeding completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();

