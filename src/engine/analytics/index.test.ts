import { describe, expect, it } from 'vitest';
import type { EventRecord } from '@/engine/types';
import {
  aggregateWorkspaceMetrics,
  buildTrajectories,
  eventFrequency,
  eventsByStep,
  rateOfChange,
  severityBreakdown,
  trajectoryStatistics,
} from './index';

const sampleEvent: EventRecord = {
  id: 'e1',
  eventId: 'e1',
  eventName: 'Flood',
  step: 1,
  time: 1,
  severity: 'warning',
  source: 'scheduled',
  affectedVariables: [],
};

describe('analytics barrel', () => {
  it('re-exports trajectory helpers', () => {
    expect(typeof buildTrajectories).toBe('function');
    expect(trajectoryStatistics({ variableId: 'v', key: 'v', points: [] }).count).toBe(0);
    expect(rateOfChange({ variableId: 'v', key: 'v', points: [] }, 1)).toBe(0);
  });

  it('re-exports metric helpers', () => {
    expect(aggregateWorkspaceMetrics([]).branchCount).toBe(0);
  });

  it('re-exports event helpers', () => {
    expect(eventFrequency([sampleEvent])).toEqual({ Flood: 1 });
    expect(severityBreakdown([sampleEvent])).toEqual({ warning: 1 });
    expect(eventsByStep([sampleEvent])).toEqual({ 1: [sampleEvent] });
  });
});
