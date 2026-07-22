let app;

try {
  app = (await import('../src/index.js')).default;
} catch (err) {
  console.error('[Treeverde] Error al inicializar la app:', err);
  // Exportamos un fallback que devuelve 500 con el error
  app = (req, res) => {
    res.status(500).json({
      error: 'Error interno del servidor',
      message: err.message
    });
  };
}

export default app;
