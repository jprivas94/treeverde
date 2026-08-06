// El DOM (jsdom) debe crearse ANTES de cargar react-dom: ver test/setupDom.js
import '../test/setupDom';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, cleanup } from '@testing-library/react';

const { default: Avatar } = await import('./Avatar.jsx');

afterEach(() => cleanup());

test('Avatar: sin foto de perfil muestra la inicial del nombre', () => {
  const { container } = render(<Avatar user={{ name: 'Ana Torres' }} />);
  assert.equal(container.textContent.trim(), 'A');
});

test('Avatar: con foto de Cloudinary renderiza miniatura w_64', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/v1234/perfil.png';
  const { container } = render(<Avatar user={{ name: 'Ana Torres', profileImage: url }} />);
  const img = container.querySelector('img');
  assert.ok(img, 'debe renderizar un <img>');
  assert.ok(img.src.includes('/w_64,'), 'la URL debe ser una miniatura w_64');
});

test('Avatar: sin usuario muestra "?"', () => {
  const { container } = render(<Avatar user={null} />);
  assert.equal(container.textContent.trim(), '?');
});
