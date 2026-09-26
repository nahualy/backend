import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productosDir = path.resolve(__dirname, '..', '..', 'uploads', 'productos');
const comprobantesDir = path.resolve(__dirname, '..', '..', 'uploads', 'comprobantes');

[productosDir, comprobantesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      'Tipo de archivo no permitido. Solo se aceptan imágenes en formato JPEG, PNG o WebP'
    );
    error.statusCode = 400;
    cb(error, false);
  }
};

const createStorage = (destinationPath) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationPath);
    },
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const baseName = path
        .basename(file.originalname, extension)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}-${baseName}${extension}`);
    },
  });
};

const limits = {
  fileSize: 5 * 1024 * 1024,
};

export const uploadProducto = multer({
  storage: createStorage(productosDir),
  fileFilter,
  limits,
});

export const uploadComprobante = multer({
  storage: createStorage(comprobantesDir),
  fileFilter,
  limits,
});

export default {
  uploadProducto,
  uploadComprobante,
};
