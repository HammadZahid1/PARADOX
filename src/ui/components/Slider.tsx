interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function Slider({ label, value, min, max, step = 1, unit, onChange, disabled = false }: SliderProps) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] text-chalk/80">{label}</span>
        <span className="font-mono text-[11px] text-cyan">{value.toFixed(step < 1 ? 2 : 0)}{unit ? ` ${unit}` : ''}</span>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer appearance-none bg-line accent-cyan disabled:cursor-not-allowed disabled:opacity-40"
      />
    </label>
  );
}
