import { test } from 'node:test';
import assert from 'node:assert/strict';

const { getCloudinaryThumb } = await import('./images.js');

test('getCloudinaryThumb: URL con versión → inserta transformación', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/v123456/tasks/img.jpg';
  const result = getCloudinaryThumb(url, 160);
  assert.equal(result, 'https://res.cloudinary.com/demo/image/upload/w_160,q_auto,f_auto/v123456/tasks/img.jpg');
});

test('getCloudinaryThumb: URL con transformación previa → la reemplaza', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/w_800,c_limit,f_auto,q_auto/v123456/tasks/img.jpg';
  const result = getCloudinaryThumb(url, 160);
  assert.equal(result, 'https://res.cloudinary.com/demo/image/upload/w_160,q_auto,f_auto/v123456/tasks/img.jpg');
});

test('getCloudinaryThumb: URL sin versión y sin transformación → la agrega', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/tasks/img.jpg';
  const result = getCloudinaryThumb(url, 64);
  assert.equal(result, 'https://res.cloudinary.com/demo/image/upload/w_64,q_auto,f_auto/tasks/img.jpg');
});

test('getCloudinaryThumb: URL sin versión pero con transformación → la descarta', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/w_800,c_limit/tasks/img.jpg';
  const result = getCloudinaryThumb(url, 64);
  assert.equal(result, 'https://res.cloudinary.com/demo/image/upload/w_64,q_auto,f_auto/tasks/img.jpg');
});

test('getCloudinaryThumb: data URL pasa intacta', () => {
  const url = 'data:image/png;base64,AAAABBBB';
  assert.equal(getCloudinaryThumb(url, 160), url);
});

test('getCloudinaryThumb: URL externa (no Cloudinary) pasa intacta', () => {
  const url = 'https://example.com/foto.png';
  assert.equal(getCloudinaryThumb(url, 160), url);
});

test('getCloudinaryThumb: valores nulos/vacíos pasan intactos', () => {
  assert.equal(getCloudinaryThumb(null), null);
  assert.equal(getCloudinaryThumb(''), '');
  assert.equal(getCloudinaryThumb(undefined), undefined);
});

test('getCloudinaryThumb: ancho por defecto 160', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/v1/a.jpg';
  assert.ok(getCloudinaryThumb(url).includes('w_160,'));
});
