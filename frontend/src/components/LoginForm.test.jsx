// ─── LoginForm: render, submit y errores ───────────────────────────────
// El DOM (jsdom) debe crearse ANTES de cargar react-dom: ver test/setupDom.js
// useAuth se mockea con mock.module para controlar login/loading sin tocar
// la API ni el store (mismo patron que Board.test.jsx con @hello-pangea/dnd).
import '../test/setupDom';
import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';

// ─── Mock de useAuth (antes de importar LoginForm) ────────────────────
let loginMock = async () => {};
let loadingMock = false;

mock.module('../hooks/useAuth', {
  exports: {
    default: () => ({ login: loginMock, register: async () => {}, loading: loadingMock }),
  },
});

const { default: LoginForm } = await import('./LoginForm.jsx');

afterEach(() => {
  cleanup();
  loginMock = async () => {};
  loadingMock = false;
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
  loginMock = async (email, password) => { called = { email, password }; };
  const { getByTestId } = renderLogin();
  fireEvent.change(getByTestId('login-email'), { target: { value: 'ana@test.com' } });
  fireEvent.change(getByTestId('login-password'), { target: { value: '123456' } });
  fireEvent.click(getByTestId('login-submit'));
  await waitFor(() => assert.deepEqual(called, { email: 'ana@test.com', password: '123456' }));
});

test('LoginForm: credenciales incorrectas muestra el error en email y password', async () => {
  loginMock = async () => { throw new Error('Email o contraseña incorrectos'); };
  const { getByTestId, getAllByText } = renderLogin();
  fireEvent.change(getByTestId('login-email'), { target: { value: 'ana@test.com' } });
  fireEvent.change(getByTestId('login-password'), { target: { value: 'mala' } });
  fireEvent.click(getByTestId('login-submit'));
  // El mensaje unificado aparece bajo email y bajo password
  await waitFor(() => assert.equal(getAllByText('Email o contraseña incorrectos').length, 2));
});

test('LoginForm: error de red muestra mensaje general de conexion', async () => {
  loginMock = async () => { throw new Error('No se pudo conectar con el servidor'); };
  const { getByTestId, getByText } = renderLogin();
  fireEvent.change(getByTestId('login-email'), { target: { value: 'ana@test.com' } });
  fireEvent.change(getByTestId('login-password'), { target: { value: '123456' } });
  fireEvent.click(getByTestId('login-submit'));
  await waitFor(() => getByText(/No se pudo conectar con el servidor/));
});

test('LoginForm: error generico se muestra como error general', async () => {
  loginMock = async () => { throw new Error('Algo salio mal'); };
  const { getByTestId, getByText } = renderLogin();
  fireEvent.change(getByTestId('login-email'), { target: { value: 'ana@test.com' } });
  fireEvent.change(getByTestId('login-password'), { target: { value: '123456' } });
  fireEvent.click(getByTestId('login-submit'));
  await waitFor(() => getByText('Algo salio mal'));
});

test('LoginForm: loading muestra skeleton y spinner en vez del form', () => {
  loadingMock = true;
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
  loginMock = async () => { throw new Error('Email o contraseña incorrectos'); };
  const { getByTestId, queryByText, getAllByText } = renderLogin();
  fireEvent.change(getByTestId('login-email'), { target: { value: 'ana@test.com' } });
  fireEvent.change(getByTestId('login-password'), { target: { value: 'mala' } });
  fireEvent.click(getByTestId('login-submit'));
  await waitFor(() => assert.equal(getAllByText('Email o contraseña incorrectos').length, 2));
  // Al teclear de nuevo, el error de ese campo desaparece
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
