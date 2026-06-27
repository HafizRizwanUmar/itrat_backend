const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  for (let c of collections) {
    const docs = await db.collection(c.name).find({ $or: [
      { 'fileUrl': /Sahih_Bukhari|Gazette|Nahjul-Balagha|urdu/i },
      { 'filePath': /Sahih_Bukhari|Gazette|Nahjul-Balagha|urdu/i },
      { 'fileName': /Sahih_Bukhari|Gazette|Nahjul-Balagha|urdu/i }
    ]}).toArray();
    if (docs.length > 0) {
      console.log('Found in', c.name);
      console.log(JSON.stringify(docs, null, 2));
    }
  }
  process.exit(0);
});
