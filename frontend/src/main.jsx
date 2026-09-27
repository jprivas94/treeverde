import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import logger from './shared/services/logger';
import './index.css';

// Capturar errores globales no controlados
window.onerror = (msg, source, line, col, error) => {
  logger.error('Error global no capturado', error || msg, { source, line, col });
};
window.addEventListener('unhandledrejection', (e) => {
  logger.error('Promesa no manejada', e.reason, {});
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
