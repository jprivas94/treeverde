import { Suspense } from 'react';
import TreeSpinner from './TreeSpinner';

// Fallback mientras se descarga el chunk de un modal cargado con React.lazy.
function ModalLoading() {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <TreeSpinner size="lg" light />
    </div>
  );
}

// Envuelve un modal lazy: <LazyModal><EditProfileModal .../></LazyModal>
export default function LazyModal({ children }) {
  return <Suspense fallback={<ModalLoading />}>{children}</Suspense>;
}
