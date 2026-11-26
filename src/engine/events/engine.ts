import type { EventRecord, SimulationEvent, VariableDefinition, WorldState } from '@/engine/types';
import type { SeededRandom } from '@/engine/random/rng';
import { createId } from '@/utils/id';
import { scheduleEvents } from './scheduler';
import { applyEventEffects, expireTemporaryEffects } from './effects';

export interface EventProcessingResult {
  state: WorldState;
  fired: EventRecord[];
  activated: string[];
  cancelled: string[];
  logs: string[];
  evaluations: ReturnType<typeof scheduleEvents>['evaluations'];
}

export class EventEngine {
  processStep(
    state: WorldState,
    events: readonly SimulationEvent[],
    definitions: readonly VariableDefinition[],
    random: SeededRandom,
    step: number,
    mode: 'deterministic' | 'probabilistic',
  ): EventProcessingResult {
    const schedule = scheduleEvents(events, state, definitions, random, step, mode);
    return this.applyQueued(state, schedule.queued.map((item) => item.event), definitions, random, schedule.evaluations);
  }

  inject(
    event: SimulationEvent,
    state: WorldState,
    definitions: readonly VariableDefinition[],
    random: SeededRandom,
    mode: 'deterministic' | 'probabilistic' = 'deterministic',
  ): EventProcessingResult {
    if (mode === 'probabilistic' && !random.chance(event.probability)) {
      return { state, fired: [], activated: [], cancelled: [], logs: [], evaluations: [{ eventId: event.id, fired: false, reason: 'probability:not-selected' }] };
    }
    return this.applyQueued(state, [event], definitions, random, [{ eventId: event.id, fired: true, reason: 'manual:injected' }]);
  }

  private applyQueued(
    state: WorldState,
    events: readonly SimulationEvent[],
    definitions: readonly VariableDefinition[],
    random: SeededRandom,
    evaluations: EventProcessingResult['evaluations'],
  ): EventProcessingResult {
    let next = state;
    const fired: EventRecord[] = [];
    const activated: string[] = [];
    const cancelled: string[] = [];
    const logs: string[] = [];
    for (const event of events) {
      const evaluation = { eventId: event.id, step: next.step, fired: true, reason: 'queued', probability: event.probability, effectsApplied: 0 };
      const application = applyEventEffects(event, next, definitions, random, evaluation);
      next = application.state;
      activated.push(...application.activatedEvents);
      cancelled.push(...application.cancelledEvents);
      logs.push(...application.log.map((message) => `[${event.name}] ${message}`));
      fired.push({
        id: createId('record'), eventId: event.id, eventName: event.name,
        step: next.step, time: next.time, severity: event.severity,
        source: event.type, probability: event.probability,
        affectedVariables: application.changedVariables,
        description: evaluation.reason,
      });
      evaluation.effectsApplied = application.changedVariables.length;
      const matching = evaluations.find((item) => item.eventId === event.id);
      if (matching) matching.reason = `${matching.reason}:applied`;
    }
    next = expireTemporaryEffects(next, next.step, definitions);
    next = {
      ...next,
      eventHistory: [...next.eventHistory, ...fired],
      metrics: { ...next.metrics, totalEvents: (next.metrics.totalEvents ?? 0) + fired.length },
    };
    return { state: next, fired, activated, cancelled, logs, evaluations };
  }
}
