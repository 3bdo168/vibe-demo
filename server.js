const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v2: cloudinary } = require('cloudinary');

// ——— Cloudinary config ———
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
app.use(express.json());

// في Vercel السيرفر Read-Only، فالكتابة في المسار الأصلي ممنوعة
// بنستخدم /tmp لو إحنا على Vercel
const os = require('os');
const DB_FILE = process.env.VERCEL
  ? path.join(os.tmpdir(), 'products.json')
  : path.join(__dirname, 'products.json');

// لو الملف مش موجود في /tmp بننقله أو بنعمله كـ فاضي
if (!fs.existsSync(DB_FILE)) {
  const seedFile = path.join(__dirname, 'products.json');
  if (fs.existsSync(seedFile)) {
    try {
      fs.copyFileSync(seedFile, DB_FILE);
    } catch {
      fs.writeFileSync(DB_FILE, '[]');
    }
  } else {
    fs.writeFileSync(DB_FILE, '[]');
  }
}

// multer يحفظ في الذاكرة بس (مش على الديسك) — كده يشتغل على Vercel
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/products', (req, res) => {
  try {
    if (!fs.existsSync(DB_FILE)) return res.json([]);
    res.json(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    // رفع الصورة على Cloudinary من الـ buffer
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'vibe-demo' },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    let products = [];
    try {
      if (fs.existsSync(DB_FILE)) {
        products = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      }
    } catch {
      products = [];
    }

    const product = {
      id: Date.now(),
      name: req.body.name,
      image: result.secure_url, // لينك Cloudinary
    };
    products.push(product);
    fs.writeFileSync(DB_FILE, JSON.stringify(products, null, 2));
    res.json(product);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'فشل رفع الصورة: ' + (err.message || 'خطأ غير معروف') });
  }
});

// تعامل مع أي error بشكل بسيط
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

if (process.env.VERCEL) {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
}
