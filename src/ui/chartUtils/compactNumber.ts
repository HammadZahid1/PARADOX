const UNITS = [
  { threshold: 1e9, suffix: 'B' },
  { threshold: 1e6, suffix: 'M' },
  { threshold: 1e3, suffix: 'K' },
] as const;

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function cleanZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function fixed(value: number, digits: number): string {
  const text = value.toFixed(digits);
  const rounded = Number(text);
  return Object.is(rounded, -0) ? cleanZero(0).toFixed(digits) : text;
}

export function formatCompactNumber(value: number, precision = 1): string {
  if (!Number.isFinite(value)) return '—';

  const digits = Math.min(6, Math.max(0, Math.floor(finiteOr(precision, 1))));
  const clean = cleanZero(value);
  const magnitude = Math.abs(clean);

  for (const unit of UNITS) {
    if (magnitude >= unit.threshold) {
      return `${fixed(clean / unit.threshold, digits)}${unit.suffix}`;
    }
  }

  return fixed(clean, digits);
}
