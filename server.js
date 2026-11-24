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

const DB_FILE = path.join(__dirname, 'products.json');
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

// multer يحفظ في الذاكرة بس (مش على الديسك) — كده يشتغل على Vercel
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/products', (req, res) => {
  res.json(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
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

    const products = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const product = {
      id: Date.now(),
      name: req.body.name,
      image: result.secure_url, // لينك Cloudinary — مش مسار محلي
    };
    products.push(product);
    fs.writeFileSync(DB_FILE, JSON.stringify(products, null, 2));
    res.json(product);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'فشل رفع الصورة' });
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
