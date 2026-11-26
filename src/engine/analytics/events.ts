import type { EventRecord } from '@/engine/types';

/** Occurrences keyed by event name. */
export function eventFrequency(events: readonly EventRecord[]): Record<string, number> {
  const frequency: Record<string, number> = {};
  for (const event of events) {
    const name = event.eventName || event.eventId;
    frequency[name] = (frequency[name] ?? 0) + 1;
  }
  return frequency;
}

/** Occurrences keyed by severity, with a stable bucket for missing values. */
export function severityBreakdown(events: readonly EventRecord[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const event of events) {
    const severity = event.severity || 'unknown';
    breakdown[severity] = (breakdown[severity] ?? 0) + 1;
  }
  return breakdown;
}

/** Event records grouped by step, preserving the input order inside each step. */
export function eventsByStep(events: readonly EventRecord[]): Record<number, EventRecord[]> {
  const grouped: Record<number, EventRecord[]> = {};
  for (const event of events) {
    const step = Number.isFinite(event.step) ? event.step : 0;
    const bucket = grouped[step];
    if (bucket) bucket.push(event);
    else grouped[step] = [event];
  }
  return grouped;
}
