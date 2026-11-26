import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger';

const tones = {
  info: { icon: Info, className: 'border-cyan/30 bg-cyan/[0.06] text-cyan' },
  success: { icon: CheckCircle2, className: 'border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-300' },
  warning: { icon: AlertTriangle, className: 'border-amber/30 bg-amber/[0.06] text-amber' },
  danger: { icon: XCircle, className: 'border-danger/30 bg-danger/[0.06] text-danger' },
} as const;

export function Callout({ tone = 'info', title, children, className = '' }: { tone?: CalloutTone; title?: string; children: ReactNode; className?: string }) {
  const config = tones[tone];
  const Icon = config.icon;
  const role = tone === 'warning' || tone === 'danger' ? 'alert' : 'status';

  return (
    <div role={role} className={`flex gap-2 border px-3 py-2 text-xs ${config.className} ${className}`}>
      <Icon size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title && <div className="font-mono text-[11px] uppercase tracking-[0.12em]">{title}</div>}
        <div className="text-chalk/80">{children}</div>
      </div>
    </div>
  );
}
