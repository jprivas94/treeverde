// El DOM (jsdom) debe crearse ANTES de cargar react-dom: ver test/setupDom.js
import '../test/setupDom';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';

const { default: CompletedTasksPanel } = await import('./CompletedTasksPanel.jsx');

afterEach(() => cleanup());

// Fechas ISO con la misma hora para evitar redondeos en daysDiff
const D = 'T00:00:00.000Z';
const makeTask = (id, title, extra = {}) => ({
  id, title, status: 'DONE', priority: 'MEDIUM', description: '', tags: '',
  images: [], dueDate: '', completedAt: '', updatedAt: '2026-08-05' + D,
  creator: { id: 'c1', name: 'Carol' }, assignee: null, ...extra,
});

const EARLY = makeTask('t1', 'Anticipada task', { priority: 'HIGH', dueDate: '2026-08-10' + D, completedAt: '2026-08-05' + D });
const ONTIME = makeTask('t2', 'A tiempo task', { dueDate: '2026-08-05' + D, completedAt: '2026-08-05' + D });
const OVERDUE = makeTask('t3', 'Vencida task', { priority: 'CRITICAL', dueDate: '2026-08-01' + D, completedAt: '2026-08-05' + D });
const NODATE = makeTask('t4', 'Sin fecha task');

const renderPanel = (tasks = [], archivedTasks = [], onEditTask = () => {}) =>
  render(<CompletedTasksPanel tasks={tasks} archivedTasks={archivedTasks} onEditTask={onEditTask} />);

const selectFilter = (container, index, value) =>
  fireEvent.change(container.querySelectorAll('select')[index], { target: { value } });

test('CompletedTasksPanel: estado vacío', () => {
  const { getByText } = renderPanel([]);
  getByText('No hay tareas completadas aun.');
});

test('CompletedTasksPanel: renderiza DONE y ARCHIVED y cuenta las tareas', () => {
  const archived = makeTask('a1', 'Archivada task', { status: 'ARCHIVED' });
  const { getByText, queryByText } = renderPanel([EARLY, archived, makeTask('t5', 'En progreso task', { status: 'IN_PROGRESS' })], []);
  getByText('Anticipada task');
  getByText('Archivada task');
  assert.equal(queryByText('En progreso task'), null, 'las tareas en curso no aparecen en el historial');
  getByText('2 tareas completadas');
});

test('CompletedTasksPanel: badges de puntualidad', () => {
  const { container } = renderPanel([EARLY, ONTIME, OVERDUE, NODATE]);
  const tbody = container.querySelector('tbody').textContent;
  assert.ok(tbody.includes('Anticipado'), 'early → Anticipado');
  assert.ok(tbody.includes('A tiempo'), 'ontime → A tiempo');
  assert.ok(tbody.includes('Vencido'), 'overdue → Vencido');
  assert.ok(tbody.includes('5 días antes'), 'etiqueta de diferencia');
  assert.ok(tbody.includes('Justo a tiempo'));
  assert.ok(tbody.includes('4 días después'));
});

test('CompletedTasksPanel: búsqueda filtra por título', () => {
  const { getByPlaceholderText, queryByText, getByText } = renderPanel([EARLY, OVERDUE]);
  fireEvent.change(getByPlaceholderText('Buscar por titulo, creador, etiquetas...'), { target: { value: 'vencida' } });
  getByText('Vencida task');
  assert.equal(queryByText('Anticipada task'), null);
});

test('CompletedTasksPanel: filtro de prioridad', () => {
  const { container, queryByText, getByText } = renderPanel([EARLY, ONTIME, OVERDUE]);
  selectFilter(container, 0, 'HIGH');
  getByText('Anticipada task');
  assert.equal(queryByText('A tiempo task'), null);
  assert.equal(queryByText('Vencida task'), null);
});

test('CompletedTasksPanel: filtro de estado Vencido', () => {
  const { container, queryByText, getByText } = renderPanel([EARLY, ONTIME, OVERDUE, NODATE]);
  selectFilter(container, 1, 'overdue');
  getByText('Vencida task');
  assert.equal(queryByText('Anticipada task'), null);
  assert.equal(queryByText('A tiempo task'), null);
  assert.equal(queryByText('Sin fecha task'), null);
});

test('CompletedTasksPanel: filtro Sin fecha', () => {
  const { container, queryByText, getByText } = renderPanel([EARLY, ONTIME, OVERDUE, NODATE]);
  selectFilter(container, 1, 'nodate');
  getByText('Sin fecha task');
  assert.equal(queryByText('Vencida task'), null);
});

test('CompletedTasksPanel: orden más antiguo primero', () => {
  const newer = makeTask('n1', 'Nueva task', { updatedAt: '2026-08-05' + D });
  const older = makeTask('o1', 'Vieja task', { updatedAt: '2026-01-01' + D });
  const { container } = renderPanel([newer, older]);
  selectFilter(container, 2, 'oldest');
  const rows = container.querySelectorAll('tbody tr');
  assert.ok(rows[0].textContent.includes('Vieja task'), 'la más antigua va primero');
});

test('CompletedTasksPanel: paginación de 5 por página', () => {
  const many = Array.from({ length: 6 }, (_, i) => makeTask('p' + i, 'Tarea ' + (i + 1)));
  const { getByText, queryByText, getByRole } = renderPanel(many);
  getByText('Página 1 de 2');
  assert.equal(getByRole('button', { name: /Anterior/ }).disabled, true, 'Anterior deshabilitado en la página 1');
  assert.equal(queryByText('Tarea 6'), null, 'la página 1 solo muestra 5');
  fireEvent.click(getByRole('button', { name: /Siguiente/ }));
  getByText('Página 2 de 2');
  getByText('Tarea 6');
  assert.equal(queryByText('Tarea 1'), null);
});

test('CompletedTasksPanel: clic en la fila llama a onEditTask', () => {
  let edited = null;
  const { getByText } = renderPanel([OVERDUE], [], (task) => { edited = task; });
  fireEvent.click(getByText('Vencida task'));
  assert.equal(edited.id, 't3');
});

test('CompletedTasksPanel: deduplica la misma tarea en tasks y archivedTasks', () => {
  const dup = makeTask('a1', 'Duplicada task');
  const { container, getByText } = renderPanel([dup], [dup]);
  getByText('Duplicada task');
  getByText('1 tarea completada');
  assert.equal(container.querySelectorAll('tbody tr').length, 1, 'solo una fila para el mismo id');
});
