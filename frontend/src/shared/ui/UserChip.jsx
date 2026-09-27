import Avatar from './Avatar';
import { getUserColor } from '../constants/kanbanConfig';

// Chip de usuario coloreado (compartidos de una tarea). `onRemove` opcional → botón ×.
export default function UserChip({ user, onRemove }) {
  const color = getUserColor(user.id);
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
      style={{ backgroundColor: color + '18', borderColor: color + '40', color }}
    >
      <Avatar user={user} sizeClass="w-3 h-3 text-[6px]" fallbackClass="text-white" style={{ backgroundColor: color }} />
      <span>{user.name}</span>
      {onRemove && (
        <button type="button" onClick={() => onRemove(user.id)} className="ml-0.5 transition" style={{ color }} title="Eliminar">
          &times;
        </button>
      )}
    </span>
  );
}
