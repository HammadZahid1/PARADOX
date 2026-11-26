import { describe, expect, it } from 'vitest';
import type { WorldState } from '@/engine/types';
import { createInitialState } from '@/engine/core/state';
import { appendTimelineEntry, createTimeline, entryAtStep, eventsUpToStep, findDivergence, latestEntry, timelineSpan } from './timeline';

const state = (step: number, id = `s${step}`): WorldState => ({ ...createInitialState({ definitions: [], seed: 1 }), id, step, time: step });

describe('timeline engine', () => {
  it('appends entries and events in step order', () => {
    const timeline = createTimeline('b1');
    const first = appendTimelineEntry(timeline, state(1), [], []);
    const second = appendTimelineEntry(first, state(2), [], []);
    expect(second.entries.map((entry) => entry.step)).toEqual([1, 2]);
    expect(entryAtStep(second, 1)?.stateId).toBe('s1');
    expect(latestEntry(second)?.step).toBe(2);
    expect(timelineSpan(second)).toEqual({ start: 1, end: 2 });
  });

  it('filters historical events', () => {
    const timeline = createTimeline('b1');
    const record = { id: 'r', eventId: 'e', eventName: 'E', step: 2, time: 2, severity: 'info', source: 'test', affectedVariables: [] };
    const withEvent = appendTimelineEntry(timeline, state(2), [], [record]);
    expect(eventsUpToStep(withEvent, 1)).toHaveLength(0);
    expect(eventsUpToStep(withEvent, 2)).toHaveLength(1);
  });

  it('detects divergence between timelines', () => {
    const left = appendTimelineEntry(createTimeline('a'), state(1, 'x'), [], []);
    const right = appendTimelineEntry(createTimeline('b'), state(2, 'y'), [], []);
    expect(findDivergence(left, right)).toBe(2);
  });
});
