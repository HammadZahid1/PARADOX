import { useEffect } from 'react';
import { useParadox } from '@/state/store';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Global PARADOX shortcuts; ignored while typing in form controls. */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const state = useParadox.getState();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        state.setCommandOpen(!state.commandOpen);
        return;
      }
      if (event.key === 'Escape') {
        if (state.modal.kind) state.closeModal();
        if (state.commandOpen) state.setCommandOpen(false);
        if (state.searchOpen) state.setSearchOpen(false);
        return;
      }
      if (isTypingTarget(event.target) || state.modal.kind || state.commandOpen || state.searchOpen) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          if (state.isPlaying) state.pause(); else state.play();
          break;
        case 'ArrowRight':
          event.preventDefault();
          state.stepForward();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          state.stepBackward();
          break;
        default: {
          const key = event.key.toLowerCase();
          if (key === 'n') state.openModal({ kind: 'newScenario' });
          if (key === 'b') state.openModal({ kind: 'newBranch' });
          if (key === 'e') state.openModal({ kind: 'injectEvent' });
          if (key === 's') state.openModal({ kind: 'snapshot' });
          if (key === '/') { event.preventDefault(); state.setSearchOpen(true); }
          break;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
