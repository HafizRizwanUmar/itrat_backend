// =============================================================
// Cloudinary Onboarding Test Script
// Run: node cloudinary_test.js
// =============================================================

const cloudinary = require("cloudinary").v2;

// --- Step 1: Configure Cloudinary (inline credentials) ---
cloudinary.config({
  cloud_name: "dbs0eosi3",       // ← your cloud name
  api_key: "884778786518986",    // ← your API key
  api_secret: "bDt9IVA7DdakLC_AQHj0Ps3ni8Q", // ← your API secret
  secure: true,
});

// Sample image from Cloudinary's public demo account
const DEMO_IMAGE_URL = "https://res.cloudinary.com/demo/image/upload/sample.jpg";

async function run() {
  try {
    // --- Step 2: Upload the image ---
    console.log("⏳ Uploading image to Cloudinary...");
    const uploadResult = await cloudinary.uploader.upload(DEMO_IMAGE_URL, {
      public_id: "quran_academy_test_image",
      overwrite: true,
      resource_type: "image",
    });

    console.log("\n✅ Upload successful!");
    console.log("   Secure URL :", uploadResult.secure_url);
    console.log("   Public ID  :", uploadResult.public_id);

    // --- Step 3: Image metadata ---
    console.log("\n📋 Image Metadata:");
    console.log("   Width      :", uploadResult.width, "px");
    console.log("   Height     :", uploadResult.height, "px");
    console.log("   Format     :", uploadResult.format);
    console.log("   File size  :", uploadResult.bytes, "bytes");

    // --- Step 4: Generate transformed URL ---
    // f_auto → Cloudinary automatically picks the best format for the user's browser (e.g., WebP, AVIF)
    // q_auto → Cloudinary automatically selects the best quality level to reduce file size without visible loss
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      transformation: [
        { fetch_format: "auto" }, // f_auto: serve best format per browser
        { quality: "auto" },      // q_auto: serve best quality/size balance
      ],
      secure: true,
    });

    console.log("\n🎉 Done! Click link below to see optimized version of the image. Check the size and the format.");
    console.log("   Transformed URL:", transformedUrl);
  } catch (err) {
    console.error("\n❌ Error:", err.message || err);
    process.exit(1);
  }
}

run();
