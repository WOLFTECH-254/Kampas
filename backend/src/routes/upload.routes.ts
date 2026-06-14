import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';

const r = Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'kyc');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG and WebP images are allowed'));
  },
});

r.post('/kyc', authenticate, upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const host = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 8000}`;
  const url  = `${host}/uploads/kyc/${req.file.filename}`;
  return res.json({ success: true, url });
});

export default r;
