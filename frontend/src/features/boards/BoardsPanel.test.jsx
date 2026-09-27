// ─── BoardsPanel: resumen, filtros, búsqueda y progreso ──────────────
import '../../test/setupDom';
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import useKanbanStore from '../../store/kanbanStore';
import { stubFetch } from '../../test/fetchStub';

const { default: BoardsPanel } = await import('./BoardsPanel.jsx');

const realFetch = globalThis.fetch;
const USER = { id: 'u1', name: 'Jean Rivas', email: 'jean@test.com' };
const MINE = {
  id: 'b1', name: 'Proyecto Alpha', description: 'Web nueva', color: 'violet', icon: '🚀', ownerId: 'u1',
  myTaskCount: 8, doneCount: 5, members: [{ ...USER, role: 'owner' }],
  stats: { overdue: 0, dueSoon: 2, lastActivity: null },
};
const SHARED = {
  id: 'b2', name: 'Cliente Beta', description: '', color: 'rose', icon: '💼', ownerId: 'u9',
  myTaskCount: 5, doneCount: 1, members: [], stats: { overdue: 1, dueSoon: 0, lastActivity: null },
};
const SUMMARY = { total: 19, pending: 7, done: 12, overdue: 1, dueSoon: 2, personal: 6, lastActivity: null };

beforeEach(() => {
  stubFetch([
    { method: 'GET', path: '/notifications', body: { notifications: [], unreadCount: 0 } },
    { method: 'GET', path: '/tasks/summary', body: SUMMARY },
  ]);
  useKanbanStore.setState({ user: USER, token: 'tok', boards: [MINE, SHARED], notifications: [], unreadCount: 0 });
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  useKanbanStore.setState({ user: null, token: null, boards: [] });
});

const renderPanel = (props = {}) =>
  render(<BoardsPanel isDark={false} onToggleTheme={() => {}} onSelectBoard={() => {}} onSelectAll={() => {}} {...props} />);

test('BoardsPanel: saluda y muestra las métricas del resumen', async () => {
  const { getByText, getByTestId } = renderPanel();
  getByText(/Hola, Jean/);
  await waitFor(() => within(getByTestId('metric-pending')).getByText('7'));
  within(getByTestId('metric-projects')).getByText('2');
  within(getByTestId('metric-dueSoon')).getByText('2');
  within(getByTestId('metric-done')).getByText('12');
});

test('BoardsPanel: cada proyecto muestra su progreso y su estado', () => {
  const { getByText, getAllByText } = renderPanel();
  getByText('5 de 8 terminadas');
  getByText('1 de 5 terminadas');
  assert.ok(getAllByText(/2 vencen pronto/).length >= 1);
  assert.ok(getAllByText(/1 vencida/).length >= 1);
});

test('BoardsPanel: filtros Míos / Compartidos', () => {
  const { getByText, queryByText } = renderPanel();
  fireEvent.click(getByText('Míos'));
  getByText('Proyecto Alpha');
  assert.equal(queryByText('Cliente Beta'), null);
  fireEvent.click(getByText('Compartidos'));
  getByText('Cliente Beta');
  assert.equal(queryByText('Proyecto Alpha'), null);
});

test('BoardsPanel: el buscador filtra por nombre y muestra estado vacío', () => {
  const { getByLabelText, getByText, queryByText } = renderPanel();
  fireEvent.change(getByLabelText('Buscar proyecto'), { target: { value: 'beta' } });
  getByText('Cliente Beta');
  assert.equal(queryByText('Proyecto Alpha'), null);
  fireEvent.change(getByLabelText('Buscar proyecto'), { target: { value: 'zzz' } });
  getByText('Ningún proyecto coincide');
});

test('BoardsPanel: abrir un proyecto y "Todas las tareas"', () => {
  let opened = null;
  let all = 0;
  const { getByText } = renderPanel({ onSelectBoard: (id) => { opened = id; }, onSelectAll: () => { all++; } });
  fireEvent.click(getByText('Proyecto Alpha'));
  assert.equal(opened, 'b1');
  fireEvent.click(getByText('Todas las tareas'));
  assert.equal(all, 1);
});

test('BoardsPanel: solo el dueño ve el menú ⋯ del proyecto', () => {
  const { getByLabelText, queryByLabelText } = renderPanel();
  getByLabelText('Opciones de Proyecto Alpha');
  assert.equal(queryByLabelText('Opciones de Cliente Beta'), null);
});
