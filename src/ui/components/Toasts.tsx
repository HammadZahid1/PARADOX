import { useEffect } from 'react';
import { useParadox } from '@/state/store';

const tone = { info: 'border-cyan/40 text-cyan', success: 'border-emerald-400/40 text-emerald-300', warning: 'border-amber/40 text-amber', error: 'border-danger/50 text-danger' } as const;

export function Toasts() {
  const toasts = useParadox((state) => state.toasts);
  const dismiss = useParadox((state) => state.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) => window.setTimeout(() => dismiss(toast.id), 4200));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, dismiss]);

  return (
    <div className="pointer-events-none fixed bottom-12 right-4 z-[90] flex w-72 flex-col gap-2" aria-live="polite">
      {toasts.map((toast) => (
        <button key={toast.id} type="button" onClick={() => dismiss(toast.id)} className={`pointer-events-auto border bg-graphite/95 px-3 py-2 text-left font-mono text-[11px] shadow-panel ${tone[toast.severity]}`}>
          {toast.message}
        </button>
      ))}
    </div>
  );
}
