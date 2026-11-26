export interface AutosaveTask<T> {
  key: string;
  value: T;
  timer: number;
}

export interface AutosaveScheduler<T> {
  schedule: (key: string, value: T) => void;
  cancel: (key: string) => void;
  cancelAll: () => void;
  pending: () => string[];
}

/** Debounces repeated writes to the same key using browser timers. */
export function createAutosaveScheduler<T>(
  delayMs: number,
  save: (key: string, value: T) => void,
): AutosaveScheduler<T> {
  const tasks = new Map<string, AutosaveTask<T>>();
  const delay = Math.max(0, Number.isFinite(delayMs) ? delayMs : 500);
  return {
    schedule: (key, value) => {
      const existing = tasks.get(key);
      if (existing) window.clearTimeout(existing.timer);
      const timer = window.setTimeout(() => {
        tasks.delete(key);
        save(key, value);
      }, delay);
      tasks.set(key, { key, value, timer });
    },
    cancel: (key) => {
      const task = tasks.get(key);
      if (task) window.clearTimeout(task.timer);
      tasks.delete(key);
    },
    cancelAll: () => {
      for (const task of tasks.values()) window.clearTimeout(task.timer);
      tasks.clear();
    },
    pending: () => [...tasks.keys()].sort(),
  };
}

export function shouldAutosave(lastSavedAt: number | undefined, now: number, intervalMs: number): boolean {
  if (lastSavedAt === undefined) return true;
  if (!Number.isFinite(lastSavedAt) || !Number.isFinite(now) || !Number.isFinite(intervalMs)) return false;
  return now - lastSavedAt >= Math.max(0, intervalMs);
}
