// ⚠️ ده الكود "الغلطان" عن قصد — بنفس الطريقة اللي الـAI بيكتبه في الـvibe coding
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const UPLOADS = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'products.json');

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

// الصور بتتحفظ جوه فولدر المشروع نفسه
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS));

app.get('/api/products', (req, res) => {
  res.json(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
});

app.post('/api/products', upload.single('image'), (req, res) => {
  const products = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const product = {
    id: Date.now(),
    name: req.body.name,
    image: '/uploads/' + req.file.filename, // مسار محلي على نفس السيرفر
  };
  products.push(product);
  fs.writeFileSync(DB_FILE, JSON.stringify(products, null, 2));
  res.json(product);
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
