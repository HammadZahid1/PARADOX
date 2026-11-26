/**
 * Fictional climate-teaching preset for the Verdant Basin.
 *
 * IMPORTANT: this is a deliberately simplified educational model, not a
 * predictor, forecast, or scientific projection. Every place and number is
 * invented and the causal links are illustrative only.
 */
import type {
  Condition,
  Scenario,
  SimulationEvent,
  SimulationRule,
  VariableDefinition,
} from '@/engine/types';
import {
  createScenario,
  defaultConfiguration,
  makeEvent,
  makeRule,
  makeVariable,
} from '@/engine/scenarios/factory';

const PREFIX = 'extra-climate';

function metric(
  key: string,
  name: string,
  initial: number,
  min: number,
  max: number,
  description: string,
  unit?: string,
): VariableDefinition {
  return makeVariable({
    id: `${PREFIX}.${key}`,
    key,
    name,
    type: 'number',
    initial,
    min,
    max,
    description,
    ...(unit ? { unit } : {}),
    tags: ['climate', 'extra'],
  });
}

function condition(rule: string, variableKey: string, operator: Condition['operator'], value: Condition['value']): Condition {
  return { id: `${PREFIX}.condition.${rule}.${variableKey}`, variableKey, operator, value };
}

const variables: VariableDefinition[] = [
  metric('atmosphericCO2', 'Atmospheric CO₂', 420, 280, 700, 'Fictional basin CO₂ concentration.', 'ppm'),
  metric('meanTemperature', 'Mean Temperature', 14.5, 10, 25, 'Fictional annual mean near-surface temperature.', '°C'),
  metric('oceanHeat', 'Ocean Heat Content', 100, 50, 250, 'Upper-ocean heat content index.'),
  metric('iceCover', 'Ice Cover', 70, 0, 100, 'Seasonal ice cover index, in percent.', '%'),
  metric('vegetation', 'Vegetation Health', 80, 0, 100, 'Modelled vegetation productivity index.'),
  metric('emissions', 'Emissions', 100, 0, 200, 'Annual emissions index, with 100 as baseline.'),
  metric('adaptation', 'Adaptation Investment', 40, 0, 100, 'Fictional adaptation and preparedness index.'),
  metric('coastalExposure', 'Coastal Exposure', 55, 0, 100, 'Share of modelled coastline exposed to high water, in percent.', '%'),
  metric('seaLevel', 'Local Sea Level', 100, 80, 180, 'Fictional local mean sea-level index.'),
  makeVariable({
    id: `${PREFIX}.warmingIndex`,
    key: 'warmingIndex',
    name: 'Warming Index',
    type: 'derived',
    initial: 0.5,
    min: -10,
    max: 20,
    description: 'Temperature above the illustrative 14 °C reference (meanTemperature - 14).',
    derivedFrom: ['meanTemperature'],
    expression: 'meanTemperature - 14',
    tags: ['climate', 'derived'],
  }),
];

const rules: SimulationRule[] = [
  makeRule({
    id: `${PREFIX}.rule.emissionsAccumulate`,
    name: 'Emissions accumulate in the atmosphere',
    priority: 100,
    condition: condition('emissionsAccumulate', 'emissions', 'gte', 105),
    effects: [
      { kind: 'increase', variableKey: 'atmosphericCO2', amount: 3 },
      { kind: 'increase', variableKey: 'meanTemperature', amount: 0.08 },
    ],
    category: 'forcing',
  }),
  makeRule({
    id: `${PREFIX}.rule.warmingFeedback`,
    name: 'Higher CO₂ raises temperature and ocean heat',
    priority: 95,
    condition: condition('warmingFeedback', 'atmosphericCO2', 'gte', 450),
    effects: [
      { kind: 'increase', variableKey: 'meanTemperature', amount: 0.12 },
      { kind: 'increase', variableKey: 'oceanHeat', amount: 1.5 },
    ],
    category: 'response',
  }),
  makeRule({
    id: `${PREFIX}.rule.iceLoss`,
    name: 'Warming reduces ice cover',
    priority: 90,
    condition: condition('iceLoss', 'meanTemperature', 'gte', 16),
    effects: [
      { kind: 'decrease', variableKey: 'iceCover', amount: 2 },
      { kind: 'increase', variableKey: 'seaLevel', amount: 0.2 },
    ],
    category: 'impacts',
  }),
  makeRule({
    id: `${PREFIX}.rule.heatStress`,
    name: 'Heat stress reduces vegetation health',
    priority: 85,
    condition: condition('heatStress', 'oceanHeat', 'gte', 115),
    effects: [
      { kind: 'decrease', variableKey: 'vegetation', amount: 1.5 },
      { kind: 'increase', variableKey: 'coastalExposure', amount: 0.5 },
    ],
    category: 'impacts',
  }),
  makeRule({
    id: `${PREFIX}.rule.vegetationUptake`,
    name: 'Healthy vegetation removes a little CO₂',
    priority: 80,
    condition: condition('vegetationUptake', 'vegetation', 'gte', 85),
    effects: [{ kind: 'decrease', variableKey: 'atmosphericCO2', amount: 1 }],
    category: 'mitigation',
  }),
  makeRule({
    id: `${PREFIX}.rule.adaptationBenefit`,
    name: 'Adaptation lowers exposure without changing sea level',
    priority: 75,
    condition: condition('adaptationBenefit', 'adaptation', 'gte', 65),
    effects: [
      { kind: 'decrease', variableKey: 'coastalExposure', amount: 2 },
      { kind: 'decrease', variableKey: 'emissions', amount: 0.5 },
    ],
    category: 'adaptation',
  }),
];

const events: SimulationEvent[] = [
  makeEvent({
    id: `${PREFIX}.event.aerosolYear`,
    name: 'Fictional volcanic aerosol year',
    description: 'A short-lived illustrative cooling perturbation followed by recovery.',
    trigger: { kind: 'scheduled', atStep: 9 },
    probability: 1,
    durationSteps: 3,
    cooldownSteps: 24,
    priority: 80,
    severity: 'notice',
    effects: [{ kind: 'log', message: 'Volcanic aerosol year begins in the teaching model.' }],
    outcomes: [
      {
        id: `${PREFIX}.outcome.aerosolYear.brief`,
        name: 'Brief aerosol effect',
        description: 'A small temporary cooling with no lasting emissions change.',
        probability: 0.7,
        effects: [
          { kind: 'decrease', variableKey: 'meanTemperature', amount: 0.3 },
          { kind: 'log', message: 'Brief aerosol cooling in the teaching model.' },
        ],
      },
      {
        id: `${PREFIX}.outcome.aerosolYear.strong`,
        name: 'Stronger aerosol effect',
        description: 'A larger illustrative cooling and vegetation response.',
        probability: 0.3,
        effects: [
          { kind: 'decrease', variableKey: 'meanTemperature', amount: 0.8 },
          { kind: 'increase', variableKey: 'vegetation', amount: 3 },
          { kind: 'log', message: 'Stronger aerosol cooling in the teaching model.' },
        ],
      },
    ],
    category: 'perturbation',
    tags: ['climate', 'teaching-model'],
  }),
  makeEvent({
    id: `${PREFIX}.event.heatwaveSeason`,
    name: 'Heatwave season',
    description: 'An illustrative hot season stresses vegetation and warms surface waters.',
    trigger: { kind: 'threshold', variableKey: 'meanTemperature', operator: 'gte', value: 16.5 },
    probability: 1,
    cooldownSteps: 18,
    priority: 85,
    severity: 'warning',
    effects: [
      { kind: 'decrease', variableKey: 'vegetation', amount: 5 },
      { kind: 'increase', variableKey: 'oceanHeat', amount: 4 },
      {
        kind: 'conditional',
        condition: condition('heatwaveSeason', 'adaptation', 'gte', 60),
        then: { kind: 'decrease', variableKey: 'coastalExposure', amount: 2 },
        otherwise: { kind: 'increase', variableKey: 'coastalExposure', amount: 4 },
      },
      { kind: 'log', message: 'Heatwave season effects applied in the teaching model.' },
    ],
    category: 'impact',
    tags: ['climate', 'teaching-model'],
  }),
  makeEvent({
    id: `${PREFIX}.event.mitigationProgram`,
    name: 'Basin mitigation program',
    description: 'A fictional policy package that cuts emissions and funds adaptation.',
    trigger: { kind: 'threshold', variableKey: 'atmosphericCO2', operator: 'gte', value: 470 },
    probability: 1,
    cooldownSteps: 25,
    priority: 90,
    severity: 'notice',
    effects: [
      { kind: 'percentChange', variableKey: 'emissions', percent: -15 },
      { kind: 'increase', variableKey: 'adaptation', amount: 10 },
      { kind: 'log', message: 'Mitigation program adopted in the teaching model.' },
    ],
    category: 'policy',
    tags: ['climate', 'policy'],
  }),
];

/** Build a fresh, deterministic simplified educational climate model. */
export function climateScenario(): Scenario {
  return createScenario({
    id: PREFIX,
    name: 'Verdant Basin Climate Classroom',
    description: 'A simplified educational model of a fictional basin; it is not a predictor.',
    domain: 'climate-education',
    variables,
    rules,
    events,
    parameters: {
      referenceTemperature: 14,
      emissionsBaseline: 100,
      adaptationThreshold: 60,
    },
    objectives: [
      {
        id: `${PREFIX}.objective.temperature`,
        name: 'Hold mean temperature below 16.5 °C',
        variableKey: 'meanTemperature',
        target: 16.5,
        operator: 'lte',
      },
      {
        id: `${PREFIX}.objective.emissions`,
        name: 'Keep the emissions index at or below 100',
        variableKey: 'emissions',
        target: 100,
        operator: 'lte',
      },
    ],
    tags: ['climate', 'extra', 'preset', 'educational-model'],
    preset: true,
    disclaimer: 'Simplified educational model of a fictional basin. Not a climate predictor, forecast or scientific projection.',
    configuration: defaultConfiguration({ seed: 43003, maxSteps: 60, autoSnapshotSteps: 6 }),
  });
}
