import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useParadox } from '@/state/store';

export function Modal({ title, children, onClose, footer }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  const reducedMotion = useParadox((state) => state.reducedMotion);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`w-full max-w-lg border border-line bg-graphite shadow-panel ${reducedMotion ? '' : 'animate-in fade-in'}`}>
        <header className="flex h-11 items-center justify-between border-b border-line px-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-chalk">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-muted hover:text-chalk"><X size={16} /></button>
        </header>
        <div className="max-h-[65vh] overflow-auto p-4 text-sm text-chalk/80">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}
