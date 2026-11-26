import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createAllPresets } from '@/engine/scenarios';
import { useParadox } from '@/state/store';
import { usePlayback } from './usePlayback';

describe('usePlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useParadox.setState({ engine: null, scenarios: [], revision: 0, isPlaying: false, speed: 1 });
    useParadox.getState().bootstrap(createAllPresets());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('advances the clock while playing and stops when paused', () => {
    renderHook(() => usePlayback());
    act(() => { useParadox.setState({ isPlaying: true, speed: 1 }); });
    const before = useParadox.getState().engine!.activeBranch.currentState.step;
    act(() => { vi.advanceTimersByTime(950); });
    expect(useParadox.getState().engine!.activeBranch.currentState.step).toBe(before + 1);
    act(() => { useParadox.setState({ isPlaying: false }); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(useParadox.getState().engine!.activeBranch.currentState.step).toBe(before + 1);
  });

  it('uses a faster interval at higher speed', () => {
    renderHook(() => usePlayback());
    act(() => { useParadox.setState({ isPlaying: true, speed: 4 }); });
    const before = useParadox.getState().engine!.activeBranch.currentState.step;
    act(() => { vi.advanceTimersByTime(250); });
    expect(useParadox.getState().engine!.activeBranch.currentState.step).toBe(before + 1);
  });
});
