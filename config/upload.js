const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'dishes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = (file.originalname && file.originalname.split('.').pop()) || 'jpg';
    const safe = ext.toLowerCase().replace(/[^a-z0-9]/g, '');
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safe || 'jpg'}`;
    cb(null, name);
  },
});

const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const maxSize = 5 * 1024 * 1024; // 5MB

const fileFilter = (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Use JPG, PNG or WebP.'), false);
  }
};

const uploadDishImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSize },
}).single('image');

module.exports = { uploadDishImage, uploadDir };
