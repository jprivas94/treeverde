// El DOM (jsdom) debe crearse ANTES de cargar react-dom: ver test/setupDom.js
import '../test/setupDom';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';

const { default: TaskFormFields } = await import('./TaskFormFields.jsx');

afterEach(() => cleanup());

const baseValues = {
  title: '', description: '', priority: 'MEDIUM', dueDate: '', tags: '',
  assigneeId: '', images: [], subtasks: [],
};

const renderForm = (overrides = {}) => {
  const patches = [];
  const calls = { onChange: (p) => patches.push(p) };
  const utils = render(
    <TaskFormFields
      values={{ ...baseValues, ...overrides.values }}
      onChange={calls.onChange}
      users={overrides.users || []}
      user={overrides.user || null}
      isAssigneeOnly={overrides.isAssigneeOnly || false}
      onSubtaskToggle={overrides.onSubtaskToggle || undefined}
    />
  );
  return { ...utils, patches, calls };
};

test('TaskFormFields: renderiza título y descripción con los valores dados', () => {
  const { getByPlaceholderText } = renderForm({ values: { title: 'Mi tarea', description: 'Detalle' } });
  assert.equal(getByPlaceholderText('Ej: Implementar login').value, 'Mi tarea');
  assert.equal(getByPlaceholderText('Descripción...').value, 'Detalle');
});

test('TaskFormFields: escribir el título llama a onChange con el patch', () => {
  const { getByPlaceholderText, patches } = renderForm();
  fireEvent.change(getByPlaceholderText('Ej: Implementar login'), { target: { value: 'Comprar leche' } });
  assert.deepEqual(patches.at(-1), { title: 'Comprar leche' });
});

test('TaskFormFields: añadir sub-tarea la agrega a la lista y limpia el input', () => {
  const { getByPlaceholderText, getByRole, patches } = renderForm();
  const input = getByPlaceholderText('Nueva sub-tarea...');
  fireEvent.change(input, { target: { value: 'Hacer café' } });
  fireEvent.click(getByRole('button', { name: /Añadir/ }));
  const patch = patches.at(-1);
  assert.equal(patch.subtasks.length, 1);
  assert.equal(patch.subtasks[0].title, 'Hacer café');
  assert.equal(patch.subtasks[0].completed, false);
  assert.equal(input.value, '', 'el input de sub-tarea se limpia');
});

test('TaskFormFields: toggle de sub-tarea actualiza completed + toggledBy y avisa al padre', () => {
  const toggles = [];
  const { getByText } = renderForm({
    values: { subtasks: [{ id: 's1', title: 'Hacer X', completed: false }] },
    user: { id: 'u1' },
    onSubtaskToggle: (next) => toggles.push(next),
  });
  const row = getByText('Hacer X').parentElement;
  fireEvent.click(row.querySelector('button'));
  assert.equal(toggles[0][0].completed, true);
  assert.equal(toggles[0][0].toggledBy, 'u1');
});

test('TaskFormFields: eliminar sub-tarea la quita de la lista', () => {
  const { getByTitle, patches } = renderForm({
    values: { subtasks: [{ id: 's1', title: 'Hacer X', completed: false }] },
  });
  fireEvent.click(getByTitle('Eliminar'));
  assert.deepEqual(patches.at(-1).subtasks, []);
});

test('TaskFormFields: cambiar la prioridad llama a onChange', () => {
  const { container, patches } = renderForm();
  fireEvent.change(container.querySelector('select'), { target: { value: 'HIGH' } });
  assert.deepEqual(patches.at(-1), { priority: 'HIGH' });
});

test('TaskFormFields: cambiar etiquetas llama a onChange', () => {
  const { getByPlaceholderText, patches } = renderForm();
  fireEvent.change(getByPlaceholderText('frontend, bug, urgente'), { target: { value: 'a, b' } });
  assert.deepEqual(patches.at(-1), { tags: 'a, b' });
});

test('TaskFormFields: isAssigneeOnly muestra los candados de creador', () => {
  const { getAllByText } = renderForm({ isAssigneeOnly: true });
  const locks = getAllByText(/Solo el creador puede cambiar/);
  assert.equal(locks.length, 3, 'asignado, prioridad y fecha bloqueados');
});

test('TaskFormFields: muestra la fecha límite formateada', () => {
  const { getByPlaceholderText } = renderForm({ values: { dueDate: '2026-08-05' } });
  const value = getByPlaceholderText('Seleccionar').value;
  assert.ok(value.includes('2026'), 'la fecha debe contener el año');
  assert.ok(value.length > 0);
});

test('TaskFormFields: renderiza miniaturas de imágenes', () => {
  const { container } = renderForm({
    values: { images: ['https://res.cloudinary.com/demo/image/upload/v1/foto.png'] },
  });
  assert.ok(container.querySelector('img'), 'debe renderizar al menos una miniatura');
});
