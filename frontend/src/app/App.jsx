import { useState } from 'react';
import useKanbanStore from '../store/kanbanStore';
import useTheme from '../shared/hooks/useTheme';
import ErrorBoundary from '../shared/ui/ErrorBoundary';
import Toast from '../shared/ui/Toast';
import useSessionRestore from '../features/auth/useSessionRestore';
import AuthScreens from '../features/auth/AuthScreens';
import useInviteLink, { TASK_INVITE, BOARD_INVITE } from '../features/invites/useInviteLink';
import BoardsPanel from '../features/boards/BoardsPanel';
import Board from '../features/kanban/Board';
import BoardSkeleton from '../features/kanban/BoardSkeleton';
import WelcomeModal from '../features/profile/WelcomeModal';
import useAppSync from './useAppSync';

// ─── App ──────────────────────────────────────────────────────────────
// Raíz: decide qué pantalla mostrar según la sesión.
//   sin token        → AuthScreens (login, registro, recuperar/restablecer)
//   token sin user   → BoardSkeleton (restaurando la sesión)
//   con sesión       → BoardsPanel (panel de tableros) o Board (Kanban)
export default function App() {
  // El tema vive aquí para que también aplique en las pantallas de auth
  const { isDark, toggle } = useTheme();
  const token = useKanbanStore((s) => s.token);
  const user = useKanbanStore((s) => s.user);
  const showWelcome = useKanbanStore((s) => s.showWelcome);
  const [view, setView] = useState('panel'); // 'panel' | 'board'

  const taskInvite = useInviteLink(TASK_INVITE, user);
  const boardInvite = useInviteLink(BOARD_INVITE, user);
  useSessionRestore();
  useAppSync(view);

  if (!token) return <AuthScreens taskInvite={taskInvite} boardInvite={boardInvite} />;

  if (!user) {
    return <ErrorBoundary><BoardSkeleton /></ErrorBoundary>;
  }

  // Abrir un tablero (o "Todas las tareas" con null): las tareas se recargan al montar Board
  const openBoard = (boardId) => {
    useKanbanStore.getState().setActiveBoard(boardId);
    useKanbanStore.getState().setTasks([], false);
    useKanbanStore.setState({ tasksLoaded: false });
    setView('board');
  };

  const backToPanel = () => {
    useKanbanStore.setState({ tasksLoaded: false });
    setView('panel');
  };

  const inviteMessage = boardInvite.message || taskInvite.message;

  return (
    <ErrorBoundary>
      <Toast message={inviteMessage} onClose={() => { boardInvite.dismiss(); taskInvite.dismiss(); }} />
      {view === 'panel' ? (
        <BoardsPanel isDark={isDark} onToggleTheme={toggle} onSelectBoard={openBoard} onSelectAll={() => openBoard(null)} />
      ) : (
        <Board isDark={isDark} onToggleTheme={toggle} onBackToBoards={backToPanel} />
      )}
      {showWelcome && <WelcomeModal />}
    </ErrorBoundary>
  );
}
