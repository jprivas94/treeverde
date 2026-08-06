// ─── RegisterForm: render, validacion local, submit y errores ─────────
// El DOM (jsdom) debe crearse ANTES de cargar react-dom: ver test/setupDom.js
// useAuth se mockea con mock.module (mismo patron que LoginForm.test.jsx).
import '../test/setupDom';
import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';

// ─── Mock de useAuth (antes de importar RegisterForm) ─────────────────
let registerMock = async () => {};
let loadingMock = false;

mock.module('../hooks/useAuth', {
  exports: {
    default: () => ({ login: async () => {}, register: registerMock, loading: loadingMock }),
  },
});

const { default: RegisterForm } = await import('./RegisterForm.jsx');

afterEach(() => {
  cleanup();
  registerMock = async () => {};
  loadingMock = false;
});

const renderRegister = (props = {}) =>
  render(<RegisterForm onSwitch={props.onSwitch || (() => {})} invite={props.invite} />);

const fillForm = (name, email, password) => {
  const utils = renderRegister();
  fireEvent.change(utils.getByPlaceholderText('Tu nombre'), { target: { value: name } });
  fireEvent.change(utils.getByPlaceholderText('tu@email.com'), { target: { value: email } });
  fireEvent.change(utils.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: password } });
  fireEvent.click(utils.getByRole('button', { name: 'Crear Cuenta' }));
  return utils;
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
  registerMock = async () => { called = true; };
  const { getByText, getByRole } = renderRegister();
  fireEvent.click(getByRole('button', { name: 'Crear Cuenta' }));
  await waitFor(() => getByText('El nombre es requerido'));
  getByText('El email es requerido');
  getByText('La contraseña es requerida');
  assert.equal(called, false, 'register no debe llamarse con campos vacios');
});

test('RegisterForm: contrasena corta muestra minimo 6 caracteres', async () => {
  let called = false;
  registerMock = async () => { called = true; };
  const { getByText } = fillForm('Ana', 'ana@test.com', '123');
  await waitFor(() => getByText(/6 caracteres/));
  assert.equal(called, false, 'register no debe llamarse con contrasena corta');
});

test('RegisterForm: submit valido llama a register con nombre, email y contrasena', async () => {
  let called = null;
  registerMock = async (name, email, password) => { called = { name, email, password }; };
  fillForm('Ana', 'ana@test.com', '123456');
  await waitFor(() =>
    assert.deepEqual(called, { name: 'Ana', email: 'ana@test.com', password: '123456' })
  );
});

test('RegisterForm: email ya registrado muestra el error bajo email', async () => {
  registerMock = async () => { throw new Error('El email ya está registrado'); };
  const { getByText } = fillForm('Ana', 'ana@test.com', '123456');
  await waitFor(() => getByText(/registrado/));
});

test('RegisterForm: error generico se muestra como error general', async () => {
  registerMock = async () => { throw new Error('Algo salio mal'); };
  const { getByText } = fillForm('Ana', 'ana@test.com', '123456');
  await waitFor(() => getByText('Algo salio mal'));
});

test('RegisterForm: loading muestra skeleton en vez del form', () => {
  loadingMock = true;
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
  // Al teclear el nombre, su error desaparece
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
