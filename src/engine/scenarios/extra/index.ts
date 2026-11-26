/** Registry of additional fictional, deterministic scenario presets. */
import type { Scenario } from '@/engine/types';
import { climateScenario } from './climate';
import { disasterScenario } from './disaster';
import { educationScenario } from './education';
import { energyScenario } from './energy';
import { healthcareScenario } from './healthcare';
import { kitchenSinkScenario } from './kitchenSink';
import { manufacturingScenario } from './manufacturing';
import { marketScenario } from './market';
import { researchScenario } from './research';
import { trafficScenario } from './traffic';

export interface ExtraScenarioPreset {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly description: string;
  readonly create: () => Scenario;
}

/** Stable registry; ids match the scenario ids produced by each factory. */
export const EXTRA_PRESETS: readonly ExtraScenarioPreset[] = [
  {
    id: 'extra-healthcare',
    name: 'Northvale Regional Health Network',
    domain: 'healthcare',
    description: 'Fictional hospital capacity, staffing, supplies and patient experience.',
    create: healthcareScenario,
  },
  {
    id: 'extra-energy',
    name: 'Lumen Isles Grid',
    domain: 'energy',
    description: 'Fictional island grid with wind, storage, fuel and reserve margins.',
    create: energyScenario,
  },
  {
    id: 'extra-climate',
    name: 'Verdant Basin Climate Classroom',
    domain: 'climate-education',
    description: 'Simplified educational climate model of a fictional basin; not a predictor.',
    create: climateScenario,
  },
  {
    id: 'extra-traffic',
    name: 'Cobalt City Commuter Corridor',
    domain: 'traffic',
    description: 'Fictional corridor with demand, signals, incidents, transit and air quality.',
    create: trafficScenario,
  },
  {
    id: 'extra-market',
    name: 'Aster Exchange Microstructure',
    domain: 'market',
    description: 'Fictional exchange with order flow, liquidity, confidence and credit.',
    create: marketScenario,
  },
  {
    id: 'extra-education',
    name: 'Larkspur District Schools',
    domain: 'education',
    description: 'Fictional district with enrolment, staffing, attendance and attainment.',
    create: educationScenario,
  },
  {
    id: 'extra-manufacturing',
    name: 'Kestrel Works Assembly Line',
    domain: 'manufacturing',
    description: 'Fictional factory with orders, throughput, downtime, defects and energy.',
    create: manufacturingScenario,
  },
  {
    id: 'extra-research',
    name: 'Aster Institute Research Portfolio',
    domain: 'research',
    description: 'Fictional institute with funding, compute, collaboration and research outputs.',
    create: researchScenario,
  },
  {
    id: 'extra-disaster',
    name: 'Sable Coast Storm Response',
    domain: 'disaster-response',
    description: 'Fictional storm exercise covering readiness, alerts, shelters and recovery.',
    create: disasterScenario,
  },
  {
    id: 'extra-kitchen-sink',
    name: 'Meridian Testbed Kitchen Sink',
    domain: 'kitchen-sink',
    description: 'Fictional scenario exercising every supported variable, trigger and effect shape.',
    create: kitchenSinkScenario,
  },
];

/** Build a fresh, independent scenario for every extra preset. */
export function createExtraPresets(): Scenario[] {
  return EXTRA_PRESETS.map((preset) => preset.create());
}
