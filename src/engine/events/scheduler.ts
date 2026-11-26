import type { QueuedEvent, SimulationEvent, VariableDefinition, WorldState } from '@/engine/types';
import type { SeededRandom } from '@/engine/random/rng';
import { evaluateTrigger, cooldownActive } from './triggers';

export interface ScheduleResult {
  queued: QueuedEvent[];
  evaluations: Array<{ eventId: string; fired: boolean; reason: string }>;
}

/** Evaluate all triggers once and produce due events for the current step. */
export function scheduleEvents(
  events: readonly SimulationEvent[],
  state: WorldState,
  definitions: readonly VariableDefinition[],
  random: SeededRandom,
  step: number,
  mode: 'deterministic' | 'probabilistic',
): ScheduleResult {
  const queued: QueuedEvent[] = [];
  const evaluations: ScheduleResult['evaluations'] = [];
  for (const event of events) {
    if (cooldownActive(event, step, state.eventHistory)) {
      evaluations.push({ eventId: event.id, fired: false, reason: 'cooldown' });
      continue;
    }
    const result = evaluateTrigger(event, { state, definitions, random, step, history: state.eventHistory, mode });
    evaluations.push({ eventId: event.id, fired: result.fired, reason: result.reason });
    if (result.fired) {
      queued.push({
        id: `${event.id}:${step}:${queued.length}`,
        event, scheduledStep: step, scheduledTime: state.time,
        reason: result.reason, source: event.type,
      });
    }
  }
  return { queued, evaluations };
}
