import type { ScalarValue } from '@/engine/types';

export function formatValue(value: ScalarValue | null | undefined, unit?: string): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : 2;
  const formatted = value.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatDelta(value: number): string {
  if (Math.abs(value) < 1e-9) return '0';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
}

export function formatTime(time: number): string {
  const safe = Math.max(0, Math.floor(time));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export function truncate(text: string, length = 48): string {
  return text.length <= length ? text : `${text.slice(0, length - 1)}…`;
}
