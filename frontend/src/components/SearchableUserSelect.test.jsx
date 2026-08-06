// El DOM (jsdom) debe crearse ANTES de cargar react-dom: ver test/setupDom.js
import '../test/setupDom';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { default: SearchableUserSelect } = await import('./SearchableUserSelect.jsx');

afterEach(() => cleanup());

const USERS = [
  { id: 'u1', name: 'Ana Torres', email: 'ana@test.com' },
  { id: 'u2', name: 'Carlos Ruiz', email: 'carlos@test.com' },
];

test('SearchableUserSelect: al enfocar muestra todos los usuarios disponibles', () => {
  const { getByRole, getAllByRole } = render(
    <SearchableUserSelect value="" onChange={() => {}} users={USERS} />
  );
  fireEvent.focus(getByRole('combobox'));
  assert.equal(getAllByRole('option').length, 2);
});

test('SearchableUserSelect: filtra por el texto tecleado', () => {
  const { getByRole, getAllByRole, getByText } = render(
    <SearchableUserSelect value="" onChange={() => {}} users={USERS} />
  );
  const input = getByRole('combobox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'ana' } });
  assert.equal(getAllByRole('option').length, 1);
  getByText('Ana Torres');
});

test('SearchableUserSelect: seleccionar llama a onChange y cierra el dropdown', () => {
  let selected = null;
  const { getByRole, getByText, queryByRole, rerender } = render(
    <SearchableUserSelect value="" onChange={(id) => { selected = id; }} users={USERS} />
  );
  const input = getByRole('combobox');
  fireEvent.focus(input);
  fireEvent.click(getByText('Carlos Ruiz'));
  assert.equal(selected, 'u2');
  assert.equal(queryByRole('listbox'), null, 'el dropdown debe cerrarse');
  // Componente controlado: el padre debe re-renderizar con el nuevo value
  rerender(<SearchableUserSelect value={selected} onChange={(id) => { selected = id; }} users={USERS} />);
  assert.equal(input.value, 'Carlos Ruiz', 'el input muestra el nombre seleccionado');
});

test('SearchableUserSelect: búsqueda en servidor con debounce llama a onSearch', async () => {
  const calls = [];
  const { getByRole } = render(
    <SearchableUserSelect
      value=""
      onChange={() => {}}
      users={USERS}
      onSearch={(q) => calls.push(q)}
      searchDebounceMs={10}
    />
  );
  const input = getByRole('combobox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'car' } });
  await waitFor(() => assert.ok(calls.includes('car'), 'onSearch debe recibir el texto tecleado'));
});
