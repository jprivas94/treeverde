// El DOM (jsdom) debe crearse ANTES de cargar react-dom: ver test/setupDom.js
import '../test/setupDom';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';

const { default: DatePickerModal } = await import('./DatePickerModal.jsx');

afterEach(() => cleanup());

const renderPicker = () => {
  const calls = { onSelect: null, onClose: 0 };
  const utils = render(
    <DatePickerModal
      value={new Date(2026, 7, 15)}
      onSelect={(d) => { calls.onSelect = d; }}
      onClose={() => { calls.onClose += 1; }}
    />
  );
  return { ...utils, calls };
};

test('DatePickerModal: muestra el mes del valor dado', () => {
  const { getByText } = renderPicker();
  getByText('Agosto 2026');
});

test('DatePickerModal: clic en un día selecciona esa fecha y cierra', () => {
  const { getByRole, calls } = renderPicker();
  fireEvent.click(getByRole('button', { name: '15' }));
  assert.equal(calls.onSelect.getFullYear(), 2026);
  assert.equal(calls.onSelect.getMonth(), 7);
  assert.equal(calls.onSelect.getDate(), 15);
  assert.equal(calls.onClose, 1);
});

test('DatePickerModal: botón Hoy selecciona la fecha actual', () => {
  const { getByRole, calls } = renderPicker();
  fireEvent.click(getByRole('button', { name: 'Hoy' }));
  const now = new Date();
  assert.equal(calls.onSelect.getFullYear(), now.getFullYear());
  assert.equal(calls.onSelect.getMonth(), now.getMonth());
  assert.equal(calls.onSelect.getDate(), now.getDate());
  assert.equal(calls.onClose, 1);
});

test('DatePickerModal: Limpiar envía null y cierra', () => {
  const { getByRole, calls } = renderPicker();
  fireEvent.click(getByRole('button', { name: 'Limpiar' }));
  assert.equal(calls.onSelect, null);
  assert.equal(calls.onClose, 1);
});

test('DatePickerModal: navegar al mes anterior cambia el encabezado', () => {
  const { container, getByText } = renderPicker();
  fireEvent.click(container.querySelectorAll('button')[0]);
  getByText('Julio 2026');
});

test('DatePickerModal: tecla Escape cierra', () => {
  const { calls } = renderPicker();
  fireEvent.keyDown(document, { key: 'Escape' });
  assert.equal(calls.onClose, 1);
});
