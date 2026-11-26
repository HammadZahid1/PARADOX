import type { ReactNode } from 'react';

type Tone = 'neutral' | 'cyan' | 'violet' | 'amber' | 'danger' | 'success';

const tones: Record<Tone, string> = {
  neutral: 'border-line text-muted bg-white/[0.02]',
  cyan: 'border-cyan/30 text-cyan bg-cyan/[0.08]',
  violet: 'border-violet/30 text-violet bg-violet/[0.08]',
  amber: 'border-amber/30 text-amber bg-amber/[0.08]',
  danger: 'border-danger/30 text-danger bg-danger/[0.08]',
  success: 'border-emerald-400/30 text-emerald-300 bg-emerald-400/[0.08]',
};

export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={`inline-flex items-center border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tones[tone]} ${className}`}>{children}</span>;
}
