// ─── LoginForm: render, submit y errores ───────────────────────────────
import '../test/setupDom';
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import LoginForm from './LoginForm.jsx';
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

const renderLogin = (props = {}) =>
  render(<LoginForm onSwitch={props.onSwitch || (() => {})} onForgotPassword={props.onForgotPassword || (() => {})} invite={props.invite} />);

test('LoginForm: renderiza titulo, campos y boton', () => {
  const { getByText, getByTestId } = renderLogin();
  getByText('Inicia sesión');
  getByTestId('login-email');
  getByTestId('login-password');
  getByTestId('login-submit');
});

test('LoginForm: submit llama a login con email y password', async () => {
  let called = null;
  stubFetch([
    {
      method: 'POST',
      path: '/auth/login',
      handler: (req) => {
        called = req.body;
        return { user: { id: 'u1', name: 'Ana' }, token: 'tok123' };
      },
      body: { user: { id: 'u1', name: 'Ana' }, token: 'tok123' }
    },
  ]);

  const { getByTestId } = renderLogin();
  fireEvent.change(getByTestId('login-email'), { target: { value: 'ana@test.com' } });
  fireEvent.change(getByTestId('login-password'), { target: { value: '123456' } });
  fireEvent.click(getByTestId('login-submit'));

  await waitFor(() => assert.deepEqual(useKanbanStore.getState().user, { id: 'u1', name: 'Ana' }));
});

test('LoginForm: credenciales incorrectas muestra el error en email y password', async () => {
  stubFetch([
    {
      method: 'POST',
      path: '/auth/login',
      status: 401,
      body: { error: 'Email o contraseña incorrectos' },
    },
  ]);

  const { getByTestId, getAllByText } = renderLogin();
  fireEvent.change(getByTestId('login-email'), { target: { value: 'ana@test.com' } });
  fireEvent.change(getByTestId('login-password'), { target: { value: 'mala' } });
  fireEvent.click(getByTestId('login-submit'));

  await waitFor(() => assert.equal(getAllByText('Email o contraseña incorrectos').length, 2));
});

test('LoginForm: error de red muestra mensaje general de conexion', async () => {
  stubFetch([
    {
      method: 'POST',
      path: '/auth/login',
      status: 500,
      body: 'Proxy error',
    },
  ]);

  const { getByTestId, getByText } = renderLogin();
  fireEvent.change(getByTestId('login-email'), { target: { value: 'ana@test.com' } });
  fireEvent.change(getByTestId('login-password'), { target: { value: '123456' } });
  fireEvent.click(getByTestId('login-submit'));

  await waitFor(() => getByText(/Error 500/));
});

test('LoginForm: error generico se muestra como error general', async () => {
  stubFetch([
    {
      method: 'POST',
      path: '/auth/login',
      status: 400,
      body: { error: 'Algo salio mal' },
    },
  ]);

  const { getByTestId, getByText } = renderLogin();
  fireEvent.change(getByTestId('login-email'), { target: { value: 'ana@test.com' } });
  fireEvent.change(getByTestId('login-password'), { target: { value: '123456' } });
  fireEvent.click(getByTestId('login-submit'));

  await waitFor(() => getByText('Algo salio mal'));
});

test('LoginForm: loading muestra skeleton y spinner en vez del form', () => {
  useKanbanStore.setState({ loading: true });
  const { getByText, queryByTestId } = renderLogin();
  getByText('Verificando credenciales...');
  assert.equal(queryByTestId('login-submit'), null, 'el form no debe renderizarse durante el loading');
});

test('LoginForm: invite muestra la tarjeta con el titulo y el creador', () => {
  const { getByText } = renderLogin({ invite: { taskTitle: 'Tarea X', creatorName: 'Bob' } });
  getByText(/Te invitaron a una tarea/);
  getByText(/Tarea X/);
  getByText(/por Bob/);
});

test('LoginForm: los errores de campo se limpian al volver a teclear', async () => {
  stubFetch([
    {
      method: 'POST',
      path: '/auth/login',
      status: 401,
      body: { error: 'Email o contraseña incorrectos' },
    },
  ]);

  const { getByTestId, queryByText, getAllByText } = renderLogin();
  fireEvent.change(getByTestId('login-email'), { target: { value: 'ana@test.com' } });
  fireEvent.change(getByTestId('login-password'), { target: { value: 'mala' } });
  fireEvent.click(getByTestId('login-submit'));
  await waitFor(() => assert.equal(getAllByText('Email o contraseña incorrectos').length, 2));

  fireEvent.change(getByTestId('login-email'), { target: { value: 'ana2@test.com' } });
  await waitFor(() => assert.equal(getAllByText('Email o contraseña incorrectos').length, 1));
  fireEvent.change(getByTestId('login-password'), { target: { value: 'mala2' } });
  await waitFor(() => assert.equal(queryByText('Email o contraseña incorrectos'), null));
});

test('LoginForm: los enlaces de registro y olvido de contrasena llaman a sus callbacks', () => {
  let switched = false;
  let forgot = false;
  const { getByText } = render(
    <LoginForm
      onSwitch={() => { switched = true; }}
      onForgotPassword={() => { forgot = true; }}
    />
  );
  fireEvent.click(getByText('Registrarse'));
  fireEvent.click(getByText('¿Olvidaste tu contraseña?'));
  assert.equal(switched, true);
  assert.equal(forgot, true);
});
