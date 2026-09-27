import { useState, useEffect, useRef } from 'react';
import useKanbanStore from '../../store/kanbanStore';
import { boardsApi } from '../../shared/services/api';
import Avatar from '../../shared/ui/Avatar';
import Modal, { ModalHeader } from '../../shared/ui/Modal';
import CopyLinkField from '../../shared/ui/CopyLinkField';
import Spinner from '../../shared/ui/Spinner';

// ─── InviteBoardModal ─────────────────────────────────────────────────
// Invitar personas a un tablero vía enlace: quien lo acepte queda como
// MIEMBRO del tablero (sus demás tareas siguen privadas). Solo el dueño
// genera el enlace (cada generación invalida el anterior) y quita miembros.
export default function InviteBoardModal({ board, onClose, onMembersChanged }) {
  const user = useKanbanStore((s) => s.user);
  const [inviteUrl, setInviteUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState('');
  const errorTimer = useRef(null);

  const isOwner = board.ownerId === user?.id || board.members?.some((m) => m.id === user?.id && m.role === 'owner');
  const members = board.members || [];

  // Borrar el enlace previo cuando cambia el tablero (seguridad ante reuso)
  useEffect(() => {
    setInviteUrl('');
    return () => clearTimeout(errorTimer.current);
  }, [board.id]);

  const showError = (msg) => {
    setError(msg);
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(''), 4000);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      setInviteUrl((await boardsApi.invite(board.id)).inviteUrl);
    } catch (err) {
      showError(err.message || 'No se pudo generar el enlace');
    } finally {
      setGenerating(false);
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

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        title="Invitar al tablero"
        onClose={onClose}
        className="flex items-center justify-between mb-1 px-5 sm:px-6 pt-5"
        titleClassName="text-base font-bold text-gray-900 dark:text-gray-100"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 px-5 sm:px-6 pb-4">
        Quien abra el enlace quedará como <strong>miembro de «{board.name}»</strong> y solo podrá
        ver y trabajar dentro de este tablero. Sus demás tareas siguen siendo privadas.
      </p>

      <div className="px-5 sm:px-6 pb-6 space-y-5">
        {!isOwner ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5">
            Solo el dueño del tablero puede generar enlaces de invitación.
          </p>
        ) : inviteUrl ? (
          <>
            <CopyLinkField url={inviteUrl} ariaLabel="Enlace de invitación al tablero" />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline underline-offset-2 disabled:opacity-50 transition"
            >
              {generating ? 'Generando…' : 'Generar otro enlace (invalida el anterior)'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2"
          >
            {generating
              ? <><Spinner /> Generando…</>
              : <><span className="text-base leading-none">{'\u{1F517}'}</span> Generar enlace de invitación</>}
          </button>
        )}

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">{error}</p>
        )}

        <div>
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Miembros ({members.length})</h3>
          <div className="space-y-1.5">
            {members.map((m) => {
              const isBoardOwner = m.role === 'owner' || m.id === board.ownerId;
              return (
                <div key={m.id} className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2">
                  <Avatar user={m} sizeClass="w-7 h-7 text-[10px]" />
                  <p className="min-w-0 flex-1 text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {m.name}
                    {isBoardOwner && <span className="ml-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-1.5 py-0.5 rounded-full">DUEÑO</span>}
                  </p>
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
            {members.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">Aún no hay miembros</p>}
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
    </Modal>
  );
}
