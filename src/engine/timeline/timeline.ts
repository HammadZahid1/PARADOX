import type { EntityId, EventRecord, Timeline, TimelineEntry, VariableChange, WorldState } from '@/engine/types';
import { createId } from '@/utils/id';

export function createTimeline(branchId: EntityId): Timeline {
  return { id: createId('tl'), branchId, entries: [], snapshots: [], events: [] };
}

export function appendTimelineEntry(
  timeline: Timeline,
  state: WorldState,
  changes: readonly VariableChange[],
  events: readonly EventRecord[],
  checkpoint = false,
): Timeline {
  const entry: TimelineEntry = {
    step: state.step, time: state.time, stateId: state.id,
    changedVariables: changes.map((change) => change.variableId),
    eventIds: events.map((event) => event.id),
    checkpoint,
  };
  return {
    ...timeline,
    entries: [...timeline.entries.filter((item) => item.step !== state.step), entry].sort((a, b) => a.step - b.step),
    events: [...timeline.events, ...events],
  };
}

export function entryAtStep(timeline: Timeline, step: number): TimelineEntry | undefined {
  return timeline.entries.find((entry) => entry.step === step);
}

export function latestEntry(timeline: Timeline): TimelineEntry | undefined {
  return timeline.entries.at(-1);
}

export function eventsUpToStep(timeline: Timeline, step: number): EventRecord[] {
  return timeline.events.filter((event) => event.step <= step);
}

export function timelineSpan(timeline: Timeline): { start: number; end: number } {
  const steps = timeline.entries.map((entry) => entry.step);
  return { start: steps[0] ?? 0, end: steps.at(-1) ?? 0 };
}

export function findDivergence(left: Timeline, right: Timeline): number | undefined {
  const leftSteps = new Set(left.entries.map((entry) => entry.step));
  for (const entry of right.entries) {
    if (entry.step === 0) continue;
    if (!leftSteps.has(entry.step)) return entry.step;
  }
  const common = left.entries.filter((entry) => right.entries.some((other) => other.step === entry.step));
  for (let i = 1; i < common.length; i += 1) {
    const a = common[i - 1]!;
    const b = common[i]!;
    if (a.stateId !== b.stateId && a.changedVariables.join() !== b.changedVariables.join()) return b.step;
  }
  return undefined;
}
