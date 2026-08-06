import { useState, useRef, useEffect, useCallback } from 'react';
import { notificationsApi } from '../services/api';
import { isRealtimeActive } from '../services/realtime';
import { broadcastNotificationsRead } from '../services/sessionSync';
import { timeAgo } from '../utils/date';
import useKanbanStore from '../store/kanbanStore';

const TYPE_ICONS = {
  ASSIGNED: '\u{1F4CC}',
  COMPLETED: '\u2705',
  SHARED: '\u{1F91D}',
  SUBTASK_COMPLETED: '\u2705',
  INVITE_ACCEPTED: '\u{1F389}',
  INFO: '\u2139\uFE0F'
};

export default function NotificationPanel() {
  // Nota: useKanbanStore() sin selector ya suscribe a TODO el store, así que
  // cuando cambia supabaseToken el componente re-renderiza y isRealtimeActive()
  // (que lee el store vía getState) se re-evalúa automáticamente.
  const token = useKanbanStore((s) => s.token);
  const notifications = useKanbanStore((s) => s.notifications);
  const unreadCount = useKanbanStore((s) => s.unreadCount);
  const setNotifications = useKanbanStore((s) => s.setNotifications);
  const markAllRead = useKanbanStore((s) => s.markAllRead);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  // Con realtime activo (credenciales + supabaseToken) las notificaciones
  // llegan solas vía el canal de Supabase: se salta el polling de 30s y solo
  // se hace la carga inicial (los eventos INSERT ya actualizan el store).
  // La condición vive en isRealtimeActive() para no desincronizarla del guard
  // de connectRealtime().
  const realtimeActive = isRealtimeActive();

  useEffect(() => {
    if (!token) return;
    const load = () => {
      notificationsApi.getAll()
        .then((data) => setNotifications(data.notifications, data.unreadCount))
        .catch(() => {});
    };
    load();
    if (realtimeActive) return undefined;
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [token, realtimeActive, setNotifications]);

  const handleToggle = useCallback(() => {
    if (!open) {
      setOpen(true);
      setLoading(true);
      notificationsApi.getAll()
        .then((data) => {
          setNotifications(data.notifications, data.unreadCount);
          notificationsApi.markRead().then(() => {
            markAllRead();
            // Propagar el "leídas" a las demás pestañas (BroadcastChannel):
            // el backend ya se marcó, las otras solo aplican el estado local.
            broadcastNotificationsRead();
          }).catch(() => {});
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
        data-testid="notification-button"
        onClick={handleToggle}
        className="relative p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-lg leading-none"
        title="Notificaciones"
      >
        <span>{'\u{1F514}'}</span>
        {unreadCount > 0 && (
          <span data-testid="unread-badge" className="absolute -top-0.5 -right-0.5 sm:top-0 sm:-right-0 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 leading-none shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
        {/* Overlay móvil/tablet */}
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
        <div className="fixed md:absolute z-50 inset-x-4 md:inset-x-auto top-1/2 md:top-full md:mt-2 -translate-y-1/2 md:translate-y-0 mx-auto md:mx-0 w-auto md:w-80 max-w-sm md:max-w-none bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-scale-in">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Notificaciones</h3>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{notifications.length} total</span>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <span className="text-2xl mb-2">{'\u{1F515}'}</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">No hay notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition ${
                      !n.read ? 'bg-emerald-50/60 dark:bg-emerald-950/40' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    } group/notif`}
                  >
                    <span className="text-base mt-0.5 shrink-0">
                      {TYPE_ICONS[n.type] || TYPE_ICONS.INFO}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${!n.read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{timeAgo(n.createdAt)}</p>
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
                        className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition opacity-0 group-hover/notif:opacity-100 text-xs leading-none p-0.5"
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
        </>
      )}
    </div>
  );
}
