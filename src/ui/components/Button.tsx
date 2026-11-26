import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'solid' | 'outline' | 'danger' | 'accent';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  active?: boolean;
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  ghost: 'text-muted hover:text-chalk hover:bg-white/5 border-transparent',
  solid: 'bg-cyan/15 text-cyan border-cyan/30 hover:bg-cyan/25',
  outline: 'border-line text-chalk/80 hover:border-cyan/40 hover:text-cyan',
  danger: 'border-danger/30 text-danger hover:bg-danger/10',
  accent: 'bg-cyan text-void border-cyan hover:brightness-110 font-medium',
};

export function Button({ variant = 'ghost', size = 'sm', icon, active = false, className = '', children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 border px-2.5 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-40 ${size === 'md' ? 'h-9 text-sm' : 'h-7 text-xs'} ${active ? 'border-cyan/50 bg-cyan/10 text-cyan' : variants[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
