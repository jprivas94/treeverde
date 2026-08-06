// ─── Integración REAL con Cloudinary (opt-in) ──────────────────────────
// Valida el contrato de subida firmada que expone POST /api/upload/sign:
// firma con el MISMO algoritmo (api_sign_request) y sube un PNG 1x1 al
// cloud configurado por entorno, para luego eliminarlo.
// Se salta si no hay CLOUDINARY_* (CI no las define → no ejecuta en CI).
// No requiere BD: replica el flujo navegador → Cloudinary con fetch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import cloudinary from 'cloudinary';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const configured = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

if (configured) {
  // Mismo arranque que backend/src/routes/upload.js: el SDK necesita la
  // config antes de api_sign_request (si no, lanza 'Must supply cloud_name').
  cloudinary.v2.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
  });
}

// PNG 1x1 transparente (68 bytes) para la subida de prueba
const TEST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

test(
  'Cloudinary: sign + upload + delete real (requiere credenciales)',
  { skip: !configured },
  async () => {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'treeverde-tests';
    const transformation = 'w_800,c_limit,f_auto,q_auto';

    // Mismo signing que backend/src/routes/upload.js
    const signature = cloudinary.v2.utils.api_sign_request(
      { timestamp, folder, transformation },
      API_SECRET
    );

    const form = new FormData();
    form.append('file', new Blob([TEST_PNG], { type: 'image/png' }), 'test-1x1.png');
    form.append('api_key', API_KEY);
    form.append('timestamp', String(timestamp));
    form.append('folder', folder);
    form.append('transformation', transformation);
    form.append('signature', signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: form }
    );
    const body = await res.json();

    assert.equal(res.ok, true, 'Cloudinary debe aceptar la subida firmada');
    assert.ok(
      body.secure_url && body.secure_url.includes(CLOUD_NAME),
      'debe devolver secure_url del cloud configurado'
    );
    assert.ok(body.public_id, 'debe devolver public_id');
    assert.ok(
      body.public_id.startsWith(folder),
      'la carpeta firmada debe aplicarse al public_id'
    );

    // Limpieza: eliminar el asset subido para no dejar basura
    const del = await cloudinary.v2.api.delete_resources([body.public_id], { type: 'upload' });
    assert.equal(del.deleted?.[body.public_id], 'deleted', 'el asset debe eliminarse');
  }
);
