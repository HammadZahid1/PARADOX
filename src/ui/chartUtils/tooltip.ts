import { formatCompactNumber } from '@/ui/chartUtils/compactNumber';

export interface TooltipEntry {
  label: string;
  value: number;
  source?: string;
  sampleCount?: number;
  provenance?: string;
}

export interface TooltipRow {
  label: string;
  value: string;
  provenance: string;
}

export interface TooltipFormatOptions {
  precision?: number;
  formatValue?: (value: number) => string;
  includeProvenance?: boolean;
  maxRows?: number;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function countText(sampleCount: number | undefined): string {
  if (typeof sampleCount !== 'number' || !Number.isFinite(sampleCount)) return '';
  const count = Math.max(0, Math.floor(sampleCount));
  return `${count} ${count === 1 ? 'sample' : 'samples'}`;
}

function buildProvenance(entry: TooltipEntry): string {
  const explicit = entry.provenance?.trim() ?? '';
  if (explicit !== '') return explicit;

  const source = entry.source?.trim() ?? '';
  const samples = countText(entry.sampleCount);
  if (source !== '' && samples !== '') return `${source} · ${samples}`;
  return source !== '' ? source : samples;
}

export function formatTooltipRows(
  entries: readonly TooltipEntry[],
  options: TooltipFormatOptions = {},
): TooltipRow[] {
  const precision = finiteOr(options.precision, 1);
  const includeProvenance = options.includeProvenance !== false;
  const maxRows = Math.max(0, Math.floor(finiteOr(options.maxRows, Number.POSITIVE_INFINITY)));
  const rows: TooltipRow[] = [];

  for (const entry of entries) {
    if (rows.length >= maxRows) break;
    const label = entry.label.trim();
    if (label === '' || !Number.isFinite(entry.value)) continue;

    const value = options.formatValue
      ? options.formatValue(entry.value)
      : formatCompactNumber(entry.value, precision);

    rows.push({
      label,
      value,
      provenance: includeProvenance ? buildProvenance(entry) : '',
    });
  }

  return rows;
}
