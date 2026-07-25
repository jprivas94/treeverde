import { Router } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import authenticate from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// ─── Configuracion de Cloudflare R2 ──────────────
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET = process.env.R2_BUCKET || 'treeverde-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

let s3Client = null;

function getS3Client() {
  if (!s3Client && R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
      },
    });
  }
  return s3Client;
}

// Todas las rutas requieren autenticacion
router.use(authenticate);

// POST /api/upload/presign — genera URL prefirmada para subir imagen directamente desde el navegador a R2
router.post('/presign', async (req, res) => {
  try {
    const client = getS3Client();

    if (!client) {
      return res.status(501).json({
        error: 'Cloudflare R2 no esta configurado',
        hint: 'Configura las variables de entorno: R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET',
      });
    }

    const { fileName, contentType, taskId } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName y contentType son requeridos' });
    }

    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Solo se permiten imagenes' });
    }

    const ext = fileName.split('.').pop() || 'png';
    const uniqueName = `tasks/${taskId || 'general'}/${crypto.randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: uniqueName,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

    let publicUrl = '';
    if (R2_PUBLIC_URL) {
      publicUrl = `${R2_PUBLIC_URL}/${uniqueName}`;
    } else {
      publicUrl = `https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${uniqueName}`;
    }

    res.json({
      uploadUrl: signedUrl,
      publicUrl,
      key: uniqueName,
    });
  } catch (err) {
    console.error('[Treeverde] Error al generar URL de upload:', err);
    res.status(500).json({ error: 'Error al preparar la subida de imagen' });
  }
});

export default router;
