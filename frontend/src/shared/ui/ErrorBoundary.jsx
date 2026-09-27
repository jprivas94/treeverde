import { Component } from 'react';
import logger from '../services/logger';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Error capturado por ErrorBoundary', error, {
      componentStack: errorInfo.componentStack?.slice(0, 500),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-4">
            <div className="text-5xl">{'\u{1F6A8}'}</div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Algo salió mal</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ocurrió un error inesperado. Los detalles han sido registrados.
            </p>
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-3 text-left">
              <p className="text-[11px] font-medium text-red-700 dark:text-red-400 font-mono break-all">
                {this.state.error?.message || 'Error desconocido'}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition"
            >
              Recargar página
            </button>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Si el problema persiste, abre la consola (F12) y busca [Treeverde] para ver los errores.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
