import ConfirmDialog, { Strong } from '../../shared/ui/ConfirmDialog';

// Confirmación para eliminar tareas en bloque: vaciar un tablero (scope 'board')
// o todas las tareas del usuario (scope 'all', vista "Todas las tareas").
export default function ConfirmClearBoardModal({ boardName, scope = 'board', taskCount = 0, onConfirm, onCancel, loading = false }) {
  const isAll = scope === 'all';
  const count = `${taskCount} ${taskCount === 1 ? 'tarea' : 'tareas'}`;

  return (
    <ConfirmDialog
      icon={isAll ? '🗑️' : '🧹'}
      title={isAll ? '¿Eliminar todas tus tareas?' : '¿Vaciar el tablero?'}
      ariaLabel={isAll ? 'Confirmar eliminación de todas las tareas' : 'Confirmar vaciado del tablero'}
      confirmLabel={isAll ? 'Eliminar todo' : 'Eliminar todas'}
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      {isAll ? (
        <>
          Se eliminarán <Strong>todas tus tareas</Strong> (activas y archivadas)
          {taskCount > 0 && <>: <Strong>{count}</Strong></>}.{' '}
          Las tareas asignadas por otras personas o solo compartidas contigo no se ven afectadas. Esta acción no se puede deshacer.
        </>
      ) : (
        <>
          Se eliminarán <Strong>todas las tareas</Strong> del tablero <Strong>«{boardName}»</Strong>
          {taskCount > 0 && <> ({count})</>}.{' '}
          Esta acción no se puede deshacer.
        </>
      )}
    </ConfirmDialog>
  );
}
