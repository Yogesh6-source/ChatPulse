import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads directory in server/uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Subdirectories for avatars and chat attachments
const avatarsDir = path.join(uploadDir, 'avatars');
const attachmentsDir = path.join(uploadDir, 'attachments');
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });
if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir, { recursive: true });

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'avatar') {
      cb(null, avatarsDir);
    } else {
      cb(null, attachmentsDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedDocTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
  ];

  if (file.fieldname === 'avatar') {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed for avatars'), false);
    }
  } else {
    // Attachments
    if ([...allowedImageTypes, ...allowedDocTypes].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File format not supported. Allowed: images, PDF, Word, plain text, ZIP'), false);
    }
  }
};

const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10;

export const upload = multer({
  storage,
  limits: { fileSize: maxFileSizeMB * 1024 * 1024 },
  fileFilter,
});
