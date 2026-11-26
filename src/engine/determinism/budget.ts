import type { Scenario } from '@/engine/types';
import { SimulationEngine } from '@/engine/simulation/engine';

export interface StepBudgetState {
  readonly limit: number;
  readonly used: number;
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Finite step budget with a bound predicate suitable for cooperative cancellation. */
export class StepBudget {
  readonly limit: number;
  private consumed: number;

  constructor(limit: number, used = 0) {
    this.limit = normalizeCount(limit);
    this.consumed = Math.min(this.limit, normalizeCount(used));
  }

  get used(): number {
    return this.consumed;
  }

  get remaining(): number {
    return this.limit - this.consumed;
  }

  get exhausted(): boolean {
    return this.remaining === 0;
  }

  /** Bound arrow function so it can be passed directly to SimulationEngine.run. */
  readonly shouldStop = (): boolean => this.exhausted;

  canConsume(amount = 1): boolean {
    const steps = normalizeCount(amount);
    return steps > 0 && steps <= this.remaining;
  }

  /** Consume up to the requested amount, clamped to the remaining budget. */
  consume(amount = 1): number {
    const steps = Math.min(normalizeCount(amount), this.remaining);
    this.consumed += steps;
    return steps;
  }

  snapshot(): StepBudgetState {
    return { limit: this.limit, used: this.consumed };
  }

  reset(): this {
    this.consumed = 0;
    return this;
  }
}

export function createStepBudget(limit: number, used = 0): StepBudget {
  return new StepBudget(limit, used);
}

/** Run an engine no further than the budget allows, preserving completed steps. */
export function runWithinBudget(engine: SimulationEngine, budget: StepBudget) {
  return engine.run(budget.remaining, () => { budget.consume(); }, budget.shouldStop);
}

/** Helper for callers that only need to know whether a scenario fits a budget. */
export function scenarioFitsBudget(scenario: Scenario, budget: StepBudget): boolean {
  return scenario.configuration.maxSteps <= budget.remaining;
}
