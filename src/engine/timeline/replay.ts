import type { Timeline, WorldState } from '@/engine/types';

export interface ReplayFrame {
  step: number;
  time: number;
  state?: WorldState;
  eventIds: readonly string[];
  changedVariables: readonly string[];
  checkpoint: boolean;
}

/** Reconstructs a replay sequence from recorded timeline entries and available states. */
export function buildReplayFrames(timeline: Timeline, states: readonly WorldState[]): ReplayFrame[] {
  const byStep = new Map(states.map((state) => [state.step, state]));
  return timeline.entries.map((entry) => ({
    step: entry.step,
    time: entry.time,
    state: byStep.get(entry.step),
    eventIds: entry.eventIds,
    changedVariables: entry.changedVariables,
    checkpoint: entry.checkpoint,
  }));
}

export function replayAtStep(frames: readonly ReplayFrame[], step: number): ReplayFrame | undefined {
  return frames.filter((frame) => frame.step <= step).at(-1);
}

export function replayDuration(frames: readonly ReplayFrame[]): number {
  return frames.reduce((total, frame) => total + frame.eventIds.length + frame.changedVariables.length, 0);
}
