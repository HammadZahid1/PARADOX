import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, renderHook } from '@testing-library/react';
import { createAllPresets } from '@/engine/scenarios';
import { useParadox } from '@/state/store';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    useParadox.setState({
      engine: null, scenarios: [], revision: 0, isPlaying: false,
      commandOpen: false, searchOpen: false, modal: { kind: null },
    });
    useParadox.getState().bootstrap(createAllPresets());
  });

  it('toggles command palette with Ctrl+K', () => {
    renderHook(() => useKeyboardShortcuts());
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(useParadox.getState().commandOpen).toBe(true);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(useParadox.getState().commandOpen).toBe(false);
  });

  it('plays and steps with space and arrow keys', () => {
    renderHook(() => useKeyboardShortcuts());
    const before = useParadox.getState().engine!.activeBranch.currentState.step;
    fireEvent.keyDown(window, { key: ' ' });
    expect(useParadox.getState().isPlaying).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(useParadox.getState().engine!.activeBranch.currentState.step).toBe(before + 1);
  });

  it('ignores shortcuts while typing in an input', () => {
    renderHook(() => useKeyboardShortcuts());
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'e' });
    expect(useParadox.getState().modal.kind).toBeNull();
    input.remove();
  });
});
