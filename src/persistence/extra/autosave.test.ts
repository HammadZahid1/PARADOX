import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutosaveScheduler, shouldAutosave } from './autosave';

describe('autosave scheduler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces repeated writes to the same key', () => {
    const saved: Array<[string, string]> = [];
    const scheduler = createAutosaveScheduler<string>(200, (key, value) => saved.push([key, value]));
    scheduler.schedule('a', 'first');
    scheduler.schedule('a', 'second');
    vi.advanceTimersByTime(250);
    expect(saved).toEqual([['a', 'second']]);
  });

  it('cancels pending work', () => {
    const save = vi.fn();
    const scheduler = createAutosaveScheduler(100, save);
    scheduler.schedule('x', 1);
    expect(scheduler.pending()).toEqual(['x']);
    scheduler.cancel('x');
    vi.advanceTimersByTime(200);
    expect(save).not.toHaveBeenCalled();
    expect(scheduler.pending()).toEqual([]);
  });

  it('gates saves by elapsed time', () => {
    expect(shouldAutosave(undefined, 100, 50)).toBe(true);
    expect(shouldAutosave(60, 100, 50)).toBe(false);
    expect(shouldAutosave(40, 100, 50)).toBe(true);
  });
});
