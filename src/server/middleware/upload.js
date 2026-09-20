const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Strictly whitelist image and video formats
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.mp4'
]);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    // Generate an entirely server-side cryptographic filename to eliminate directory traversal risks
    const randomHex = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    cb(null, `evidence-${timestamp}-${randomHex}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  // Validate both extension and MIME type against strict whitelist
  if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIME_TYPES.has(mime)) {
    return cb(null, true);
  }

  cb(
    new Error(
      'Invalid file format. Only JPEG (.jpg, .jpeg), PNG (.png), WebP (.webp), and MP4 (.mp4) files are permitted.'
    )
  );
};

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
    files: 5 // Maximum 5 files per request
  },
  fileFilter
});

module.exports = upload;
