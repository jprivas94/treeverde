import { Router } from 'express';
import cloudinary from 'cloudinary';
import authenticate from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = Router();

// ─── Configuracion de Cloudinary ────────────────
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Configurar el SDK una sola vez
if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.v2.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

// Todas las rutas requieren autenticacion
router.use(authenticate);

// POST /api/upload/sign — genera firma para subir imagen desde el navegador a Cloudinary
router.post('/sign', async (req, res) => {
  try {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return res.status(501).json({
        error: 'Cloudinary no esta configurado',
        hint: 'Configura las variables de entorno: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
      });
    }

    const { fileName, prefix, imageType } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName es requerido' });
    }

    const folder = prefix || 'tasks';
    const timestamp = Math.round(Date.now() / 1000);

    // Transformaciones según tipo de imagen
    const transformations = imageType === 'avatar'
      ? 'w_200,h_200,c_fill,f_auto,q_auto'
      : 'w_800,c_limit,f_auto,q_auto';

    // Generar firma para upload firmado (incluye la transformación)
    const paramsToSign = {
      timestamp,
      folder,
      transformation: transformations,
    };

    const signature = cloudinary.v2.utils.api_sign_request(
      paramsToSign,
      CLOUDINARY_API_SECRET
    );

    res.json({
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY,
      signature,
      timestamp,
      folder,
      transformations,
    });
  } catch (err) {
    logger.error('Error al generar firma de Cloudinary', err, { userId: req.userId, fileName: req.body?.fileName });
    res.status(500).json({ error: 'Error al preparar la subida de imagen' });
  }
});

export default router;
