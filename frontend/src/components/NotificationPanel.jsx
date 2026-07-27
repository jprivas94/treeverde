import { useState, useRef, useEffect, useCallback } from 'react';
import { notificationsApi } from '../services/api';
import useKanbanStore from '../store/kanbanStore';

function timeAgo(dateStr) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

const TYPE_ICONS = {
  ASSIGNED: '\u{1F4CC}',
  COMPLETED: '\u2705',
  SHARED: '\u{1F91D}',
  SUBTASK_COMPLETED: '\u2705',
  INFO: '\u2139\uFE0F'
};

export default function NotificationPanel() {
  const { token } = useKanbanStore();
  const notifications = useKanbanStore((s) => s.notifications);
  const unreadCount = useKanbanStore((s) => s.unreadCount);
  const setNotifications = useKanbanStore((s) => s.setNotifications);
  const markAllRead = useKanbanStore((s) => s.markAllRead);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    const load = () => {
      notificationsApi.getAll()
        .then((data) => setNotifications(data.notifications, data.unreadCount))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [token, setNotifications]);

  const handleToggle = useCallback(() => {
    if (!open) {
      setOpen(true);
      setLoading(true);
      notificationsApi.getAll()
        .then((data) => {
          setNotifications(data.notifications, data.unreadCount);
          notificationsApi.markRead().then(() => markAllRead()).catch(() => {});
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setOpen(false);
    }
  }, [open, setNotifications, markAllRead]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleToggle}
        className="relative p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition text-lg leading-none"
        title="Notificaciones"
      >
        <span>{'\u{1F514}'}</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 sm:top-0 sm:-right-0 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 leading-none shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-fade-scale-in">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Notificaciones</h3>
            <span className="text-[10px] text-gray-400">{notifications.length} total</span>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <span className="text-2xl mb-2">{'\u{1F515}'}</span>
                <p className="text-xs text-gray-500">No hay notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition ${
                      !n.read ? 'bg-emerald-50/60' : 'hover:bg-gray-50'
                    } group/notif`}
                  >
                    <span className="text-base mt-0.5 shrink-0">
                      {TYPE_ICONS[n.type] || TYPE_ICONS.INFO}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(false);
                          notificationsApi.remove(n.id)
                            .then(() => setNotifications(
                              notifications.filter((x) => x.id !== n.id),
                              unreadCount - (n.read ? 0 : 1)
                            ))
                            .catch(() => {});
                        }}
                        className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover/notif:opacity-100 text-xs leading-none p-0.5"
                        title="Eliminar"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
