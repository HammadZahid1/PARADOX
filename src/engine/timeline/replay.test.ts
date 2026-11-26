import { describe, expect, it } from 'vitest';
import type { WorldState } from '@/engine/types';
import { createInitialState } from '@/engine/core/state';
import { appendTimelineEntry, createTimeline } from './timeline';
import { buildReplayFrames, replayAtStep, replayDuration } from './replay';

const state = (step: number): WorldState => ({ ...createInitialState({ definitions: [], seed: 1 }), step, time: step });

describe('simulation replay', () => {
  const timeline = appendTimelineEntry(appendTimelineEntry(createTimeline('b'), state(0), [], []), state(1), [{ variableId: 'v', from: 1, to: 2, step: 1, time: 1, source: 'test' }], []);
  const states = [state(0), state(1)];

  it('reconstructs frames from real timeline data', () => {
    const frames = buildReplayFrames(timeline, states);
    expect(frames).toHaveLength(2);
    expect(frames[1]?.state?.step).toBe(1);
    expect(frames[1]?.changedVariables).toEqual(['v']);
  });

  it('supports seeking and complexity estimates', () => {
    const frames = buildReplayFrames(timeline, states);
    expect(replayAtStep(frames, 0)?.step).toBe(0);
    expect(replayAtStep(frames, 99)?.step).toBe(1);
    expect(replayDuration(frames)).toBe(1);
  });
});
