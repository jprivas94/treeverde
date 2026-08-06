// El DOM (jsdom) debe crearse ANTES de cargar react-dom: ver test/setupDom.js
import '../test/setupDom';
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import useKanbanStore from '../store/kanbanStore';
import { stubFetch } from '../test/fetchStub';

const { default: NotificationPanel } = await import('./NotificationPanel.jsx');

const realFetch = globalThis.fetch;

const NOW = new Date().toISOString();
const NOTIFICATIONS = [
  { id: 'n1', type: 'ASSIGNED', message: 'Te asignaron una tarea', read: false, createdAt: NOW },
  { id: 'n2', type: 'SHARED', message: 'Compartieron una tarea contigo', read: true, createdAt: NOW },
];

const defaultHandlers = () => [
  { method: 'GET', path: '/notifications', body: { notifications: NOTIFICATIONS, unreadCount: 1 } },
  { method: 'PATCH', path: '/notifications/read', body: {} },
];

function seedStore({ token = 'tok', notifications = NOTIFICATIONS, unreadCount = 1 } = {}) {
  useKanbanStore.setState({ token, notifications, unreadCount });
}

beforeEach(() => stubFetch(defaultHandlers()));

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  useKanbanStore.setState({ token: null, notifications: [], unreadCount: 0 });
});

test('NotificationPanel: muestra el badge con el número de no leídas', () => {
  seedStore({ unreadCount: 1 });
  const { getByTestId } = render(<NotificationPanel />);
  assert.equal(getByTestId('unread-badge').textContent.trim(), '1');
});

test('NotificationPanel: sin no leídas no muestra badge', () => {
  seedStore({ unreadCount: 0, notifications: NOTIFICATIONS.map((n) => ({ ...n, read: true })) });
  const { queryByTestId } = render(<NotificationPanel />);
  assert.equal(queryByTestId('unread-badge'), null);
});

test('NotificationPanel: abrir el panel muestra las notificaciones del store', async () => {
  seedStore({});
  const { getByTestId, getByRole, getByText } = render(<NotificationPanel />);
  fireEvent.click(getByTestId('notification-button'));
  getByRole('heading', { name: 'Notificaciones' });
  await waitFor(() => getByText('Te asignaron una tarea'));
  getByText('Compartieron una tarea contigo');
});

test('NotificationPanel: abrir el panel marca todas como leídas', async () => {
  seedStore({});
  const { getByTestId, queryByTestId } = render(<NotificationPanel />);
  fireEvent.click(getByTestId('notification-button'));
  await waitFor(() => assert.equal(useKanbanStore.getState().unreadCount, 0));
  assert.equal(queryByTestId('unread-badge'), null, 'el badge desaparece al marcar leídas');
});

test('NotificationPanel: eliminar una notificación la quita de la lista', async () => {
  seedStore({});
  stubFetch([
    { method: 'GET', path: '/notifications', body: { notifications: NOTIFICATIONS, unreadCount: 1 } },
    { method: 'PATCH', path: '/notifications/read', body: {} },
    { method: 'DELETE', path: '/notifications/n1', body: {} },
  ]);
  const { getByTestId, getAllByTitle, queryByText } = render(<NotificationPanel />);
  fireEvent.click(getByTestId('notification-button'));
  await waitFor(() => getAllByTitle('Eliminar').length > 0);
  // Hay un botón por notificación: eliminar la primera (n1)
  fireEvent.click(getAllByTitle('Eliminar')[0]);
  await waitFor(() => assert.equal(queryByText('Te asignaron una tarea'), null));
  await waitFor(() => assert.equal(useKanbanStore.getState().unreadCount, 0));
});
