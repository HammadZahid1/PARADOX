import { describe, expect, it } from 'vitest';
import type { EventRecord, VariableDefinition } from '@/engine/types';
import { aggregateEventImpacts, severityWeight } from './eventImpact';

function event(name: string, step: number, severity: string, variables: readonly string[]): EventRecord {
  return {
    id: `${name}-${step}`,
    eventId: `${name}-${step}`,
    eventName: name,
    step,
    time: step,
    severity,
    source: 'conditional',
    affectedVariables: variables,
  };
}

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'population', name: 'Population', type: 'number', initial: 10 },
  { id: 'v2', key: 'temperature', name: 'Temperature', type: 'number', initial: 20 },
];

describe('severityWeight', () => {
  it('orders known severities and falls back for unknown buckets', () => {
    expect(severityWeight('info')).toBeLessThan(severityWeight('notice'));
    expect(severityWeight('notice')).toBeLessThan(severityWeight('warning'));
    expect(severityWeight('warning')).toBeLessThan(severityWeight('critical'));
    expect(severityWeight('CRITICAL')).toBe(4);
    expect(severityWeight('unknown')).toBe(1);
  });
});

describe('aggregateEventImpacts', () => {
  it('groups real event records by variable key and severity, then ranks them', () => {
    const events = [
      event('Flood', 2, 'warning', ['v1', 'v2']),
      event('Quake', 4, 'critical', ['v1']),
      event('Flood', 1, 'info', ['v2']),
    ];
    const impacts = aggregateEventImpacts(events, { definitions });
    expect(impacts.map((impact) => impact.variableKey)).toEqual(['population', 'temperature']);
    expect(impacts[0]).toEqual({
      variableKey: 'population',
      count: 2,
      severity: { warning: 1, critical: 1 },
      events: { Flood: 1, Quake: 1 },
      firstStep: 2,
      lastStep: 4,
      score: 7,
    });
    expect(impacts[1]?.score).toBe(4);
    expect(impacts[1]?.events).toEqual({ Flood: 2 });
    expect(impacts[1]?.firstStep).toBe(1);
  });

  it('applies topN and keeps summaries independent of later input mutation', () => {
    const events = [event('Flood', 2, 'warning', ['v1', 'v2'])];
    const top = aggregateEventImpacts(events, { definitions, topN: 1 });
    expect(top).toHaveLength(1);
    expect(top[0]?.variableKey).toBe('population');
    const first = top[0];
    if (first) first.severity['warning'] = 99;
    expect(events[0]?.affectedVariables).toEqual(['v1', 'v2']);
    expect(aggregateEventImpacts(events, { definitions })[1]?.severity['warning']).toBe(1);
  });

  it('buckets unknown severities and falls back to the variable id without definitions', () => {
    const impacts = aggregateEventImpacts([event('Anomaly', 3, '', ['v3'])]);
    expect(impacts).toEqual([{
      variableKey: 'v3',
      count: 1,
      severity: { unknown: 1 },
      events: { Anomaly: 1 },
      firstStep: 3,
      lastStep: 3,
      score: 1,
    }]);
    expect(aggregateEventImpacts([])).toEqual([]);
    expect(aggregateEventImpacts([event('No targets', 1, 'info', [])])).toEqual([]);
  });
});
