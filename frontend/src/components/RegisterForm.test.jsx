// ─── RegisterForm: render, validacion local, submit y errores ─────────
import '../test/setupDom';
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import RegisterForm from './RegisterForm.jsx';
import useKanbanStore from '../store/kanbanStore';
import { stubFetch } from '../test/fetchStub';

const realFetch = globalThis.fetch;

beforeEach(() => {
  useKanbanStore.setState({ loading: false, user: null, token: null });
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  useKanbanStore.setState({ loading: false, user: null, token: null });
});

const renderRegister = (props = {}) =>
  render(<RegisterForm onSwitch={props.onSwitch || (() => {})} invite={props.invite} />);

const fillForm = (utils, name, email, password) => {
  fireEvent.change(utils.getByPlaceholderText('Tu nombre'), { target: { value: name } });
  fireEvent.change(utils.getByPlaceholderText('tu@email.com'), { target: { value: email } });
  fireEvent.change(utils.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: password } });
  fireEvent.click(utils.getByRole('button', { name: 'Crear Cuenta' }));
};

test('RegisterForm: renderiza titulo, campos y boton', () => {
  const { getByPlaceholderText, getByRole } = renderRegister();
  getByRole('heading', { name: 'Crear Cuenta' });
  getByPlaceholderText('Tu nombre');
  getByPlaceholderText('tu@email.com');
  getByPlaceholderText('Mínimo 6 caracteres');
});

test('RegisterForm: campos vacios muestran errores locales y no llaman a register', async () => {
  let called = false;
  stubFetch([
    {
      method: 'POST',
      path: '/auth/register',
      body: { user: { id: 'u1' }, token: 'tok' },
    },
  ]);

  const { getByText, getByRole } = renderRegister();
  fireEvent.click(getByRole('button', { name: 'Crear Cuenta' }));
  await waitFor(() => getByText('El nombre es requerido'));
  getByText('El email es requerido');
  getByText('La contraseña es requerida');
  assert.equal(useKanbanStore.getState().user, null, 'register no debe llamarse con campos vacios');
});

test('RegisterForm: contrasena corta muestra minimo 6 caracteres', async () => {
  stubFetch([
    {
      method: 'POST',
      path: '/auth/register',
      body: { user: { id: 'u1' }, token: 'tok' },
    },
  ]);

  const utils = renderRegister();
  fillForm(utils, 'Ana', 'ana@test.com', '123');
  await waitFor(() => utils.getByText(/6 caracteres/));
  assert.equal(useKanbanStore.getState().user, null, 'register no debe llamarse con contrasena corta');
});

test('RegisterForm: submit valido llama a register con nombre, email y contrasena', async () => {
  stubFetch([
    {
      method: 'POST',
      path: '/auth/register',
      body: { user: { id: 'u1', name: 'Ana' }, token: 'tok' },
    },
  ]);

  const utils = renderRegister();
  fillForm(utils, 'Ana', 'ana@test.com', '123456');
  await waitFor(() => assert.deepEqual(useKanbanStore.getState().user, { id: 'u1', name: 'Ana' }));
});

test('RegisterForm: email ya registrado muestra el error bajo email', async () => {
  stubFetch([
    {
      method: 'POST',
      path: '/auth/register',
      status: 400,
      body: { error: 'El email ya está registrado' },
    },
  ]);

  const utils = renderRegister();
  fillForm(utils, 'Ana', 'ana@test.com', '123456');
  await waitFor(() => utils.getByText(/registrado/));
});

test('RegisterForm: error generico se muestra como error general', async () => {
  stubFetch([
    {
      method: 'POST',
      path: '/auth/register',
      status: 400,
      body: { error: 'Algo salio mal' },
    },
  ]);

  const utils = renderRegister();
  fillForm(utils, 'Ana', 'ana@test.com', '123456');
  await waitFor(() => utils.getByText('Algo salio mal'));
});

test('RegisterForm: loading muestra skeleton en vez del form', () => {
  useKanbanStore.setState({ loading: true });
  const { getByText, queryByPlaceholderText } = renderRegister();
  getByText('Creando tu cuenta...');
  assert.equal(queryByPlaceholderText('Tu nombre'), null, 'el form no debe renderizarse durante el loading');
});

test('RegisterForm: invite muestra la tarjeta con el titulo y el creador', () => {
  const { getByText } = renderRegister({ invite: { taskTitle: 'Tarea Y', creatorName: 'Carol' } });
  getByText(/Te invitaron a una tarea/);
  getByText(/Tarea Y/);
  getByText(/por Carol/);
});

test('RegisterForm: los errores de campo se limpian al volver a teclear', async () => {
  const { getByRole, getByText, getByPlaceholderText, queryByText } = renderRegister();
  fireEvent.click(getByRole('button', { name: 'Crear Cuenta' }));
  await waitFor(() => getByText('El nombre es requerido'));
  getByText('El email es requerido');
  getByText('La contraseña es requerida');

  fireEvent.change(getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
  await waitFor(() => assert.equal(queryByText('El nombre es requerido'), null));
  getByText('El email es requerido');
  getByText('La contraseña es requerida');
});

test('RegisterForm: el enlace a login llama a onSwitch', () => {
  let switched = false;
  const { getByText } = renderRegister({ onSwitch: () => { switched = true; } });
  fireEvent.click(getByText('Iniciar Sesión'));
  assert.equal(switched, true);
});
