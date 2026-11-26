export function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (checked: boolean) => void; description?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-xs text-chalk/90">{label}</span>
        {description && <span className="block text-[10px] text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-4 w-8 shrink-0 border transition-colors ${checked ? 'border-cyan/60 bg-cyan/25' : 'border-line bg-white/5'}`}
      >
        <span className={`absolute top-0.5 h-2.5 w-2.5 transition-all ${checked ? 'left-[18px] bg-cyan' : 'left-0.5 bg-muted'}`} />
      </button>
    </label>
  );
}
