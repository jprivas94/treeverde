import { test, expect } from '@playwright/test';

// NOTA sobre el layering de suites (ver también src/services/sessionSync.e2e.test.js):
// - Este archivo es el e2e REAL (Playwright): corre en CI con backend + BD
//   efímera, validando la sincronización en dos pestañas del navegador real.
// - src/services/sessionSync.e2e.test.js es el HARNESS SIMULADO (node:test,
//   BroadcastChannel mockeado) que corre en `npm test` sin infraestructura.
// Se complementan, no se sustituyen.

// ─── Verificación e2e real (Playwright) de la sincronización de sesión ──
// Abre DOS pestañas reales del navegador y verifica la propagación de
// login/logout/perfil/leídas con el transporte BroadcastChannel
// (mensajería nativa entre pestañas del mismo origen).
//
// Requisitos:
//   - Backend local en el puerto 3001 con la BD sembrada (seed) y los
//     usuarios jean@test.com / alice@test.com (password 123456).
//   - Frontend dev server en el 5173. Si no están corriendo,
//     playwright.config.js los levanta (webServer + reuseExistingServer).

const JEAN = { email: 'jean@test.com', password: '123456' };
const ALICE = { email: 'alice@test.com', password: '123456' };

// ─── Helpers ────────────────────────────────────────────────────────────

async function login(page, { email, password } = JEAN) {
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  // El tablero aparece cuando el user se cargó (el menú de usuario está en el header)
  await expect(page.getByTestId('user-menu-button')).toBeVisible({ timeout: 20000 });
  // El modal de bienvenida se auto-cierra a los 2.5s: esperar a que desaparezca
  const welcome = page.getByRole('heading', { name: /Bienvenido/ });
  await expect(welcome.first()).toBeHidden({ timeout: 10000 });
}

async function logout(page) {
  await page.getByTestId('user-menu-button').click();
  await page.getByTestId('logout-button').click();
  // El modal de despedida dura ~2s antes del logout real
  await expect(page.getByTestId('login-email')).toBeVisible({ timeout: 20000 });
}

/** Login vía API directa (para preparar el escenario de notificaciones). */
async function apiLogin(api, email, password) {
  const res = await api.post('/api/auth/login', { data: { email, password } });
  expect(res.ok(), 'login vía API falló para ' + email).toBeTruthy();
  return res.json();
}

/**
 * Verifica la propagación de perfil: A edita el nombre → B lo refleja.
 * Restaura el nombre original SIEMPRE (try/finally) para no ensuciar la BD dev.
 */
async function verifyProfilePropagation(pageA, pageB) {
  const originalName = (await pageA.getByTestId('user-menu-name').innerText()).trim();
  const newName = 'Jean E2E ' + (Date.now() % 100000);

  const editName = async (name) => {
    await pageA.getByTestId('user-menu-button').click();
    await pageA.getByTestId('edit-profile-button').click();
    await pageA.getByTestId('profile-name-input').fill(name);
    await pageA.getByTestId('profile-save-button').click();
    // El modal cierra solo ~1.5s tras el éxito
    await expect(pageA.getByTestId('profile-save-button')).toBeHidden({ timeout: 15000 });
  };

  try {
    // Editar en A
    await editName(newName);
    // B muestra el nuevo nombre (broadcastProfileUpdate)
    await expect(pageB.getByTestId('user-menu-name')).toHaveText(newName, { timeout: 10000 });
  } finally {
    // Restaurar el nombre original aunque falle una aserción
    const currentName = (await pageA.getByTestId('user-menu-name').innerText()).trim();
    if (currentName !== originalName) {
      await editName(originalName);
      await expect(pageB.getByTestId('user-menu-name')).toHaveText(originalName, { timeout: 10000 });
    }
  }
}

/**
 * Prepara una notificación no leída para jean: alice crea una tarea y la
 * comparte con ella → notificación SHARED (no leída). Devuelve { api, taskId,
 * aliceToken } para la limpieza best-effort en finally.
 */
async function seedUnreadNotification(playwright) {
  const api = await playwright.request.newContext({ baseURL: 'http://localhost:3001' });
  try {
    const alice = await apiLogin(api, ALICE.email, ALICE.password);
    const jean = await apiLogin(api, JEAN.email, JEAN.password);

    const createRes = await api.post('/api/tasks', {
      headers: { Authorization: 'Bearer ' + alice.token },
      data: { title: 'Tarea e2e ' + Date.now(), status: 'TODO' },
    });
    expect(createRes.ok()).toBeTruthy();
    const task = await createRes.json();

    const shareRes = await api.post('/api/tasks/' + task.id + '/share', {
      headers: { Authorization: 'Bearer ' + alice.token },
      data: { userId: jean.user.id },
    });
    expect(shareRes.ok()).toBeTruthy();

    return { api, taskId: task.id, aliceToken: alice.token };
  } catch (err) {
    await api.dispose();
    throw err;
  }
}

/**
 * Flujo de leídas en el navegador: B carga las notificaciones al montar el
 * panel → badge de no leídas visible; A abre el panel (marca todo leído +
 * broadcast) → el badge de B desaparece.
 */
async function verifyNotificationsRead(pageA, pageB) {
  await expect(pageB.getByTestId('unread-badge')).toBeVisible({ timeout: 20000 });
  await pageA.getByTestId('notification-button').click();
  await expect(pageB.getByTestId('unread-badge')).toBeHidden({ timeout: 20000 });
}

/** Limpieza best-effort: borra la tarea compartida (alice es la creadora). */
async function cleanupUnreadNotification(api, taskId, aliceToken) {
  if (taskId && aliceToken) {
    try {
      await api.delete('/api/tasks/' + taskId, {
        headers: { Authorization: 'Bearer ' + aliceToken },
      });
    } catch {
      // best-effort: ignorar fallos de limpieza
    }
  }
  await api.dispose();
}

// ─── 1. BroadcastChannel: login/logout ─────────────────────────────────

test('BroadcastChannel: login y logout se propagan entre pestañas', async ({ browser }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  await pageA.goto('/');
  await pageB.goto('/');
  await expect(pageA.getByTestId('login-email')).toBeVisible();

  // Login en A → B recibe la sesión automáticamente (broadcastLogin)
  await login(pageA);
  await expect(pageB.getByTestId('user-menu-button')).toBeVisible({ timeout: 20000 });

  // Logout en A → B cierra sesión también (broadcastLogout)
  await logout(pageA);
  await expect(pageB.getByTestId('login-email')).toBeVisible({ timeout: 20000 });

  await context.close();
});

// ─── 2. Perfil propagado: BroadcastChannel ─────────────────────────────

test('BroadcastChannel: editar perfil en A se propaga a B', async ({ browser }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  try {
    await pageA.goto('/');
    await pageB.goto('/');
    await login(pageA);
    await expect(pageB.getByTestId('user-menu-button')).toBeVisible({ timeout: 20000 });
    await verifyProfilePropagation(pageA, pageB);
  } finally {
    await context.close();
  }
});

// ─── 3. Notificaciones leídas: BroadcastChannel ───────────────────────

test('BroadcastChannel: marcar leídas en A se refleja en B', async ({ browser, playwright }) => {
  const seeded = await seedUnreadNotification(playwright);
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  try {
    await pageA.goto('/');
    await pageB.goto('/');
    await login(pageA);
    await expect(pageB.getByTestId('user-menu-button')).toBeVisible({ timeout: 20000 });
    await verifyNotificationsRead(pageA, pageB);
  } finally {
    await context.close();
    await cleanupUnreadNotification(seeded.api, seeded.taskId, seeded.aliceToken);
  }
});
