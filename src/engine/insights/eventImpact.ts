import type { EventRecord, VariableDefinition } from '@/engine/types';

const SEVERITY_WEIGHTS: Readonly<Record<string, number>> = {
  info: 1,
  notice: 2,
  warning: 3,
  critical: 4,
};

export interface EventImpactOptions {
  /** Used to resolve affected variable ids to stable variable keys. */
  definitions?: readonly VariableDefinition[];
  /** Maximum number of ranked summaries to return; defaults to all. */
  topN?: number;
}

export interface EventImpactSummary {
  variableKey: string;
  count: number;
  severity: Record<string, number>;
  events: Record<string, number>;
  firstStep: number;
  lastStep: number;
  /** Severity-weighted occurrence count; descriptive, not a causal impact estimate. */
  score: number;
}

/** Descriptive weight for a severity bucket; unknown severities fall back to 1. */
export function severityWeight(severity: string): number {
  return SEVERITY_WEIGHTS[severity.toLowerCase()] ?? 1;
}

/**
 * Aggregate real fired-event records by affected variable/key and severity.
 * Rankings describe the recorded log; they never establish that an event
 * caused a variable to change.
 */
export function aggregateEventImpacts(
  events: readonly EventRecord[],
  options: EventImpactOptions = {},
): EventImpactSummary[] {
  const keysById = new Map<string, string>();
  for (const definition of options.definitions ?? []) keysById.set(definition.id, definition.key);

  const byKey = new Map<string, EventImpactSummary>();
  for (const record of events) {
    const severity = record.severity || 'unknown';
    const eventName = record.eventName || record.eventId;
    const step = Number.isFinite(record.step) ? record.step : 0;

    for (const variableId of record.affectedVariables) {
      const key = keysById.get(variableId) ?? variableId;
      let summary = byKey.get(key);
      if (!summary) {
        summary = {
          variableKey: key,
          count: 0,
          severity: {},
          events: {},
          firstStep: step,
          lastStep: step,
          score: 0,
        };
        byKey.set(key, summary);
      }
      summary.count += 1;
      summary.severity[severity] = (summary.severity[severity] ?? 0) + 1;
      summary.events[eventName] = (summary.events[eventName] ?? 0) + 1;
      summary.firstStep = Math.min(summary.firstStep, step);
      summary.lastStep = Math.max(summary.lastStep, step);
    }
  }

  const ranked = [...byKey.values()].map((summary) => ({
    ...summary,
    severity: { ...summary.severity },
    events: { ...summary.events },
    score: Object.entries(summary.severity).reduce(
      (total, [level, count]) => total + severityWeight(level) * count,
      0,
    ),
  }));
  ranked.sort(
    (left, right) => right.score - left.score || right.count - left.count || left.variableKey.localeCompare(right.variableKey),
  );

  const rawTopN = options.topN;
  const topN = typeof rawTopN === 'number' && Number.isFinite(rawTopN)
    ? Math.max(0, Math.floor(rawTopN))
    : ranked.length;
  return ranked.slice(0, topN);
}
