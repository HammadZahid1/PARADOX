/**
 * Deterministic builders for scenario data.
 *
 * All timestamps and identifiers are fixed so preset scenarios are byte-for-byte
 * reproducible. Deep cloning is explicit (rather than relying on structuredClone)
 * to keep builders portable across test and browser environments.
 */
import type {
  CausalGraph,
  Condition,
  EventEffect,
  EventOutcome,
  EventTrigger,
  EventType,
  RuleEffect,
  ScalarValue,
  Scenario,
  ScenarioObjective,
  SimulationConfiguration,
  SimulationEvent,
  SimulationRule,
  VariableDefinition,
} from '@/engine/types';

export type VariableInput = Pick<VariableDefinition, 'id' | 'key' | 'name' | 'type' | 'initial'>
  & Partial<Omit<VariableDefinition, 'id' | 'key' | 'name' | 'type' | 'initial'>>;

export type RuleInput = Pick<SimulationRule, 'id' | 'name' | 'effects'>
  & Partial<Omit<SimulationRule, 'id' | 'name' | 'effects'>>;

export type EventInput = Pick<SimulationEvent, 'id' | 'name' | 'trigger' | 'effects'>
  & Partial<Omit<SimulationEvent, 'id' | 'name' | 'trigger' | 'effects'>>;

export interface ScenarioInput {
  id: string;
  name: string;
  description: string;
  domain: string;
  variables: readonly VariableDefinition[];
  rules?: readonly SimulationRule[];
  events?: readonly SimulationEvent[];
  parameters?: Record<string, ScalarValue>;
  objectives?: readonly ScenarioObjective[];
  tags?: readonly string[];
  configuration?: Partial<SimulationConfiguration>;
  disclaimer?: string;
  worldId?: string;
  preset?: boolean;
}

function cloneCondition(condition: Condition): Condition {
  return { ...condition };
}

function cloneTrigger(trigger: EventTrigger): EventTrigger {
  return trigger.kind === 'dependency'
    ? { ...trigger, eventIds: [...trigger.eventIds] }
    : { ...trigger };
}

function cloneEffect(effect: EventEffect): EventEffect {
  if (effect.kind === 'conditional') {
    return {
      ...effect,
      condition: cloneCondition(effect.condition),
      then: cloneEffect(effect.then),
      ...(effect.otherwise ? { otherwise: cloneEffect(effect.otherwise) } : {}),
    };
  }
  return { ...effect };
}

function cloneRuleEffect(effect: RuleEffect): RuleEffect {
  return { ...effect };
}

function cloneOutcome(outcome: EventOutcome): EventOutcome {
  return { ...outcome, effects: outcome.effects.map(cloneEffect) };
}

function cloneVariable(variable: VariableDefinition): VariableDefinition {
  return {
    ...variable,
    ...(variable.derivedFrom ? { derivedFrom: [...variable.derivedFrom] } : {}),
    ...(variable.tags ? { tags: [...variable.tags] } : {}),
    ...(variable.constraints
      ? {
        constraints: {
          ...variable.constraints,
          ...(variable.constraints.allowed ? { allowed: [...variable.constraints.allowed] } : {}),
        },
      }
      : {}),
  };
}

function cloneRule(rule: SimulationRule): SimulationRule {
  return {
    ...rule,
    effects: rule.effects.map(cloneRuleEffect),
    ...(rule.condition ? { condition: cloneCondition(rule.condition) } : {}),
    ...(rule.conditions ? { conditions: rule.conditions.map(cloneCondition) } : {}),
  };
}

function cloneEvent(event: SimulationEvent): SimulationEvent {
  return {
    ...event,
    trigger: cloneTrigger(event.trigger),
    conditions: event.conditions.map(cloneCondition),
    effects: event.effects.map(cloneEffect),
    dependencies: [...event.dependencies],
    ...(event.outcomes ? { outcomes: event.outcomes.map(cloneOutcome) } : {}),
    ...(event.tags ? { tags: [...event.tags] } : {}),
    ...(event.metadata ? { metadata: { ...event.metadata } } : {}),
  };
}

function cloneObjective(objective: ScenarioObjective): ScenarioObjective {
  return { ...objective };
}

function cloneCausalGraph(graph: CausalGraph): CausalGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({ ...node })),
    edges: graph.edges.map((edge) => ({
      ...edge,
      ...(edge.condition ? { condition: cloneCondition(edge.condition) } : {}),
    })),
  };
}

function inferEventType(trigger: EventTrigger): EventType {
  switch (trigger.kind) {
    case 'scheduled': return 'scheduled';
    case 'threshold':
    case 'boolean': return 'conditional';
    case 'probability': return 'random';
    case 'dependency': return 'triggered';
    case 'recurring': return 'recurring';
    case 'cascade': return 'cascading';
    case 'manual': return 'manual';
  }
}

function normalizeProbability(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

/** Create a variable with stable defaults and independent option arrays. */
export function makeVariable(input: VariableInput): VariableDefinition {
  return {
    id: input.id,
    key: input.key,
    name: input.name,
    type: input.type,
    initial: input.initial,
    description: input.description ?? `Simulation variable ${input.name}`,
    ...(input.unit !== undefined ? { unit: input.unit } : {}),
    ...(input.min !== undefined ? { min: input.min } : {}),
    ...(input.max !== undefined ? { max: input.max } : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
    ...(input.constraints ? { constraints: { ...input.constraints } } : {}),
    ...(input.derivedFrom ? { derivedFrom: [...input.derivedFrom] } : {}),
    ...(input.expression !== undefined ? { expression: input.expression } : {}),
    ...(input.tags ? { tags: [...input.tags] } : {}),
  };
}

/** Create an enabled rule; conditions and effects are copied. */
export function makeRule(input: RuleInput): SimulationRule {
  return {
    id: input.id,
    name: input.name,
    description: input.description ?? `Rule ${input.name}`,
    priority: input.priority ?? 0,
    effects: input.effects.map(cloneRuleEffect),
    enabled: input.enabled ?? true,
    category: input.category ?? 'general',
    ...(input.condition ? { condition: cloneCondition(input.condition) } : {}),
    ...(input.conditions ? { conditions: input.conditions.map(cloneCondition) } : {}),
  };
}

/**
 * Create an event. Threshold/boolean triggers infer the `conditional` event type,
 * matching the engine's conditional event semantics.
 */
export function makeEvent(input: EventInput): SimulationEvent {
  return {
    id: input.id,
    name: input.name,
    description: input.description ?? `Event ${input.name}`,
    type: input.type ?? inferEventType(input.trigger),
    trigger: cloneTrigger(input.trigger),
    probability: normalizeProbability(input.probability),
    conditions: (input.conditions ?? []).map(cloneCondition),
    effects: input.effects.map(cloneEffect),
    ...(input.outcomes ? { outcomes: input.outcomes.map(cloneOutcome) } : {}),
    ...(input.durationSteps !== undefined ? { durationSteps: input.durationSteps } : {}),
    ...(input.cooldownSteps !== undefined ? { cooldownSteps: input.cooldownSteps } : {}),
    dependencies: [...(input.dependencies ?? [])],
    priority: input.priority ?? 5,
    severity: input.severity ?? 'notice',
    enabled: input.enabled ?? true,
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.tags ? { tags: [...input.tags] } : {}),
    ...(input.metadata ? { metadata: { ...input.metadata } } : {}),
  };
}

/** Fixed, deterministic configuration shared by all presets. */
export function defaultConfiguration(overrides: Partial<SimulationConfiguration> = {}): SimulationConfiguration {
  return {
    stepDuration: 1,
    maxSteps: 120,
    seed: 1337,
    mode: 'deterministic',
    propagationLimit: 6,
    autoSnapshotSteps: 10,
    strictValidation: true,
    ...overrides,
  };
}

/** Assemble a scenario with fixed versioning timestamps and copied collections. */
export function createScenario(input: ScenarioInput): Scenario {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    domain: input.domain,
    worldId: input.worldId ?? `world:${input.id}`,
    variables: input.variables.map(cloneVariable),
    parameters: input.parameters ? { ...input.parameters } : {},
    rules: (input.rules ?? []).map(cloneRule),
    events: (input.events ?? []).map(cloneEvent),
    configuration: defaultConfiguration(input.configuration),
    objectives: (input.objectives ?? []).map(cloneObjective),
    tags: [...(input.tags ?? [])],
    preset: input.preset ?? false,
    createdAt: 0,
    updatedAt: 0,
    version: 1,
    ...(input.disclaimer !== undefined ? { disclaimer: input.disclaimer } : {}),
  };
}

/** Deep-copy a scenario without sharing nested rule/event/graph data. */
export function cloneScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,
    variables: scenario.variables.map(cloneVariable),
    parameters: { ...scenario.parameters },
    rules: scenario.rules.map(cloneRule),
    events: scenario.events.map(cloneEvent),
    configuration: { ...scenario.configuration },
    objectives: scenario.objectives.map(cloneObjective),
    tags: [...scenario.tags],
    ...(scenario.causalGraph ? { causalGraph: cloneCausalGraph(scenario.causalGraph) } : {}),
  };
}
