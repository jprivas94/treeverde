import ConfirmDialog, { Strong } from '../../shared/ui/ConfirmDialog';

// Confirmación para eliminar una tarea.
export default function ConfirmDeleteModal({ task, onConfirm, onCancel, loading = false }) {
  return (
    <ConfirmDialog
      icon="🗑️"
      title="¿Eliminar tarea?"
      ariaLabel="Confirmar eliminación"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      ¿Estás seguro de que quieres eliminar la tarea <Strong>«{task.title}»</Strong>?
      Esta acción no se puede deshacer.
    </ConfirmDialog>
  );
}
