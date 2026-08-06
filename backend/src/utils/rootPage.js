// ─── Página raíz de la API ────────────────────────────────────────────
// HTML de la ruta "/" del backend (redirige al frontend / lista endpoints).
// Extraído de index.js para mantener el entry point legible.

export function renderRootPage(frontendUrl) {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Treeverde API</title>
      <style>
        body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0fdf4; }
        .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 24px rgba(0,0,0,0.1); text-align: center; max-width: 420px; }
        h1 { color: #065f46; font-size: 1.5rem; margin-bottom: 0.5rem; }
        p { color: #6b7280; font-size: 0.875rem; line-height: 1.5; }
        a { display: inline-block; margin-top: 1rem; background: #059669; color: white; text-decoration: none; padding: 0.625rem 1.5rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; transition: background 0.2s; }
        a:hover { background: #047857; }
        .api { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; }
        .api a { background: #e5e7eb; color: #374151; font-weight: 500; font-size: 0.75rem; padding: 0.375rem 1rem; margin: 0.25rem; display: inline-block; }
        .api a:hover { background: #d1d5db; }
      </style>
    </head>
    <body>
      <div class="card">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">📋</div>
        <h1>Treeverde API</h1>
        <p>El servidor backend está funcionando correctamente.</p>
        <a href="${frontendUrl}">Ir al Tablero →</a>
        <div class="api">
          <p style="margin-bottom: 0.75rem;">Endpoints disponibles:</p>
          <a href="/api/health">/api/health</a>
          <a href="/api/auth/me">/api/auth/me</a>
          <a href="/api/tasks">/api/tasks</a>
          <a href="/api/users">/api/users</a>
        </div>
      </div>
    </body>
    </html>
  `;
}
