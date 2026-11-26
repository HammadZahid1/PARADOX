import { describe, expect, it } from 'vitest';
import type { EventRecord } from '@/engine/types';
import { eventFrequency, eventsByStep, severityBreakdown } from './events';

function event(name: string, step: number, severity: string, source = 'random'): EventRecord {
  return {
    id: `${name}-${step}`,
    eventId: `${name}-${step}`,
    eventName: name,
    step,
    time: step,
    severity,
    source,
    affectedVariables: [],
  };
}

describe('eventFrequency', () => {
  it('counts occurrences by event name', () => {
    const events = [event('Flood', 1, 'warning'), event('Flood', 2, 'warning'), event('Quake', 2, 'critical')];
    expect(eventFrequency(events)).toEqual({ Flood: 2, Quake: 1 });
  });

  it('returns an empty record for no events', () => {
    expect(eventFrequency([])).toEqual({});
  });
});

describe('severityBreakdown', () => {
  it('counts occurrences by severity and buckets missing severity', () => {
    const events = [event('A', 1, 'info'), event('B', 2, 'info'), event('C', 3, '')];
    expect(severityBreakdown(events)).toEqual({ info: 2, unknown: 1 });
  });
});

describe('eventsByStep', () => {
  it('groups events by step while preserving their input order', () => {
    const first = event('A', 1, 'info');
    const second = event('B', 1, 'warning');
    const third = event('C', 3, 'critical');
    expect(eventsByStep([first, third, second])).toEqual({ 1: [first, second], 3: [third] });
  });

  it('handles an empty event log', () => {
    expect(eventsByStep([])).toEqual({});
  });
});
