/**
 * Blank custom scenario plus a fully local template-based generator.
 *
 * The generator never calls a network or AI service. Its rules are transparent:
 *  1. Every finite starting condition becomes a bounded numeric variable whose
 *     key is derived from the supplied name and whose initial value is preserved.
 *  2. Each variable gets two simple rules: values at or above their starting
 *     level drift up by a small amount; values at or below drift down. The
 *     different priorities make the tie at the baseline deterministic.
 *  3. Each event name becomes a scheduled event at step `5 + 7 * index` (capped
 *     inside the scenario duration) with a log and small numeric nudges to the
 *     first one or two variables.
 *  4. Duration is clamped to 30..200 and the seed is a deterministic hash of
 *     the title, domain and duration.
 */
import type {
  EventEffect,
  ScalarValue,
  Scenario,
  SimulationEvent,
  SimulationRule,
  VariableDefinition,
} from '@/engine/types';
import {
  cloneScenario,
  createScenario,
  defaultConfiguration,
  makeEvent,
  makeRule,
  makeVariable,
} from './factory';

export interface GeneratedScenarioInput {
  title: string;
  domain: string;
  startingConditions: Record<string, number>;
  eventNames: string[];
  duration: number;
}

function slug(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'item';
}

function identifier(value: string, index: number, used: Set<string>): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const prefixed = cleaned && !/^[0-9]/.test(cleaned) ? cleaned : `variable_${cleaned || index + 1}`;
  let candidate = prefixed;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${prefixed}_${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function seedFromText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 1_000_000) + 1;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function clampDuration(duration: number): number {
  if (!Number.isFinite(duration)) return 100;
  return Math.min(200, Math.max(30, Math.floor(duration)));
}

/** Build a valid, blank custom scenario with optional overrides. */
export function customScenario(overrides: Partial<Scenario> = {}): Scenario {
  const base = createScenario({
    id: 'custom-scenario',
    name: 'Custom Scenario',
    description: 'A blank scenario ready for user-defined variables, rules and events.',
    domain: 'custom',
    variables: [],
    rules: [],
    events: [],
    tags: ['custom'],
    preset: false,
    disclaimer: 'Blank custom scenario with no assumptions about a domain.',
  });

  const merged: Scenario = {
    id: overrides.id ?? base.id,
    name: overrides.name ?? base.name,
    description: overrides.description ?? base.description,
    domain: overrides.domain ?? base.domain,
    worldId: overrides.worldId ?? base.worldId,
    variables: overrides.variables ?? base.variables,
    parameters: overrides.parameters ?? base.parameters,
    rules: overrides.rules ?? base.rules,
    events: overrides.events ?? base.events,
    causalGraph: overrides.causalGraph ?? base.causalGraph,
    configuration: defaultConfiguration({ ...base.configuration, ...(overrides.configuration ?? {}) }),
    objectives: overrides.objectives ?? base.objectives,
    tags: overrides.tags ?? base.tags,
    preset: overrides.preset ?? base.preset,
    createdAt: overrides.createdAt ?? base.createdAt,
    updatedAt: overrides.updatedAt ?? base.updatedAt,
    version: overrides.version ?? base.version,
    disclaimer: overrides.disclaimer ?? base.disclaimer,
  };

  return cloneScenario(merged);
}

/**
 * Generate a deterministic scenario from a small local template. No network
 * calls, random seeds from the clock, or model inference are involved.
 */
export function generateScenario(input: GeneratedScenarioInput): Scenario {
  const title = input.title.trim() || 'Generated Scenario';
  const domain = input.domain.trim() || 'custom';
  const id = `generated.${slug(title)}.${slug(domain)}`;
  const maxSteps = clampDuration(input.duration);
  const usedKeys = new Set<string>();

  const variables: VariableDefinition[] = Object.entries(input.startingConditions).map(([rawKey, rawValue], index) => {
    const key = identifier(rawKey, index, usedKeys);
    const initial = Number.isFinite(rawValue) ? round6(rawValue) : 0;
    const magnitude = Math.min(Math.abs(initial), 1e12);
    const bound = Math.max(1e6, magnitude * 2 + 1000);
    return makeVariable({
      id: `${id}.variable.${key}`,
      key,
      name: rawKey.trim() || `Variable ${index + 1}`,
      type: 'number',
      initial,
      min: -bound,
      max: bound,
      description: `Generated from starting condition "${rawKey}".`,
      tags: ['generated', 'local-template'],
    });
  });

  const rules: SimulationRule[] = variables.flatMap((variable, index) => {
    const baseline = typeof variable.initial === 'number' ? variable.initial : 0;
    const driftUp = round6(0.5 + index * 0.05);
    const driftDown = round6(0.25 + index * 0.05);
    return [
      makeRule({
        id: `${id}.rule.${variable.key}.up`,
        name: `${variable.name} upward drift`,
        description: 'Template rule: at or above the starting level, nudge the variable upward.',
        priority: 10,
        condition: { id: `${id}.condition.${variable.key}.up`, variableKey: variable.key, operator: 'gte', value: baseline },
        effects: [{ kind: 'increase', variableKey: variable.key, amount: driftUp }],
        category: 'local-template',
      }),
      makeRule({
        id: `${id}.rule.${variable.key}.down`,
        name: `${variable.name} downward drift`,
        description: 'Template rule: at or below the starting level, nudge the variable downward.',
        priority: 9,
        condition: { id: `${id}.condition.${variable.key}.down`, variableKey: variable.key, operator: 'lte', value: baseline },
        effects: [{ kind: 'decrease', variableKey: variable.key, amount: driftDown }],
        category: 'local-template',
      }),
    ];
  });

  const events: SimulationEvent[] = input.eventNames.map((rawName, index) => {
    const name = rawName.trim() || `Event ${index + 1}`;
    const effects: EventEffect[] = [{ kind: 'log', message: `${name}: local template effects applied.` }];
    if (variables.length > 0) {
      const first = variables[0]!;
      const second = variables[1] ?? first;
      effects.unshift(
        { kind: 'increase', variableKey: first.key, amount: round6(1 + index * 0.5) },
        { kind: 'decrease', variableKey: second.key, amount: round6(0.5 + index * 0.25) },
      );
    }
    return makeEvent({
      id: `${id}.event.${index + 1}.${slug(name)}`,
      name,
      description: `Generated scheduled event derived from the name "${name}".`,
      type: 'scheduled',
      trigger: { kind: 'scheduled', atStep: Math.min(maxSteps - 1, 5 + index * 7) },
      probability: 1,
      durationSteps: 2,
      cooldownSteps: 5,
      priority: 5,
      severity: 'notice',
      effects,
      category: 'local-template',
      tags: ['generated', 'local-template'],
    });
  });

  const parameters: Record<string, ScalarValue> = {
    sourceTitle: title,
    sourceDomain: domain,
    templateVersion: '1.0',
    generatedVariableCount: variables.length,
    generatedEventCount: events.length,
  };

  return createScenario({
    id,
    name: title,
    description: `Locally generated scenario from ${variables.length} starting conditions and ${events.length} event names using transparent template rules.`,
    domain,
    variables,
    rules,
    events,
    parameters,
    tags: ['generated', 'local-template', 'custom'],
    preset: false,
    disclaimer: 'Locally generated from templates without network or AI. Simplified educational model.',
    configuration: defaultConfiguration({
      maxSteps,
      seed: seedFromText(`${title}|${domain}|${maxSteps}`),
      autoSnapshotSteps: Math.max(5, Math.floor(maxSteps / 10)),
    }),
  });
}
