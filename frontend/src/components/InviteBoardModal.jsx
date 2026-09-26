import { useState, useEffect, useRef, useCallback } from 'react';
import { boardsApi } from '../services/api';
import Avatar from './Avatar';

// ─── InviteBoardModal ─────────────────────────────────────────────────
// Invitar personas a un tablero vía enlace: quien lo acepte queda como
// MIEMBRO del tablero y solo podrá ver/trabajar dentro de él (las tareas
// personales del resto siguen siendo privadas). Solo el dueño genera el
// enlace; cada generación invalida el anterior. También permite quitar
// miembros (no al dueño).
export default function InviteBoardModal({ board, onClose, onMembersChanged }) {
  const [inviteUrl, setInviteUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const errorTimer = useRef(null);
  const [error, setError] = useState('');

  const isOwner = board.ownerId === board.members?.find((m) => m.role === 'owner')?.id || board.ownerId;

  // Borrar el enlace previo cuando cambia el tablero (seguridad ante reuso)
  useEffect(() => {
    setInviteUrl('');
    setCopied(false);
    return () => clearTimeout(errorTimer.current);
  }, [board.id]);

  const showError = useCallback((msg) => {
    setError(msg);
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(''), 4000);
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await boardsApi.invite(board.id);
      setInviteUrl(res.inviteUrl);
      setCopied(false);
    } catch (err) {
      showError(err.message || 'No se pudo generar el enlace');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // portapapeles bloqueado: noop
    }
  };

  const handleRemoveMember = async (userId) => {
    setRemovingId(userId);
    try {
      await boardsApi.removeMember(board.id, userId);
      onMembersChanged?.();
    } catch (err) {
      showError(err.message || 'No se pudo quitar al miembro');
    } finally {
      setRemovingId(null);
    }
  };

  // Escuchar Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const members = board.members || [];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-1 px-5 sm:px-6 pt-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Invitar al tablero</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none" aria-label="Cerrar">&times;</button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 px-5 sm:px-6 pb-4">
          Quien abra el enlace quedará como <strong>miembro de «{board.name}»</strong> y solo podrá
          ver y trabajar dentro de este tablero. Sus demás tareas siguen siendo privadas.
        </p>

        <div className="px-5 sm:px-6 pb-6 space-y-5">
          {/* ── Generar / copiar enlace ── */}
          {isOwner ? (
            <>
              {inviteUrl ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-900 rounded-xl px-3 py-2">
                    <span className="text-emerald-500 text-sm" aria-hidden="true">{'\u{1F517}'}</span>
                    <input
                      readOnly
                      value={inviteUrl}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 min-w-0 bg-transparent text-xs text-gray-700 dark:text-gray-200 font-medium outline-none"
                      aria-label="Enlace de invitación al tablero"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-3 sm:px-4 py-2.5 text-xs font-bold rounded-xl transition shrink-0 shadow-sm ${
                      copied
                        ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                    }`}
                  >
                    {copied ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando…</>
                  ) : (
                    <><span className="text-base leading-none">{'\u{1F517}'}</span> Generar enlace de invitación</>
                  )}
                </button>
              )}

              {inviteUrl && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline underline-offset-2 disabled:opacity-50 transition"
                >
                  {generating ? 'Generando…' : 'Generar otro enlace (invalida el anterior)'}
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5">
              Solo el dueño del tablero puede generar enlaces de invitación.
            </p>
          )}

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* ── Miembros actuales ── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Miembros ({members.length})
            </h3>
            <div className="space-y-1.5">
              {members.map((m) => {
                const isBoardOwner = m.role === 'owner' || m.id === board.ownerId;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2"
                  >
                    <Avatar user={m} sizeClass="w-7 h-7 text-[10px]" fallbackClass="bg-emerald-500 text-white" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {m.name}
                        {isBoardOwner && <span className="ml-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-1.5 py-0.5 rounded-full">DUEÑO</span>}
                      </p>
                    </div>
                    {!isBoardOwner && isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={removingId === m.id}
                        className="text-[10px] font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 transition shrink-0"
                        title="Quitar del tablero"
                      >
                        {removingId === m.id ? 'Quitando…' : 'Quitar'}
                      </button>
                    )}
                  </div>
                );
              })}
              {members.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">Aún no hay miembros</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md shadow-emerald-600/25 transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
