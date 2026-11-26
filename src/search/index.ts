import type { EntityId, Scenario, SimulationEvent, VariableDefinition } from '@/engine/types';
import type { SimulationEngine } from '@/engine/simulation/engine';

export type SearchKind = 'scenario' | 'variable' | 'event' | 'branch' | 'rule' | 'view';

export interface SearchDocument {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  keywords: string;
  scenarioId?: EntityId;
  refId?: EntityId;
  viewId?: string;
}

export interface SearchHit {
  document: SearchDocument;
  score: number;
}

function scenarioDocuments(scenario: Scenario): SearchDocument[] {
  const scenarioDoc: SearchDocument = {
    id: `scenario:${scenario.id}`,
    kind: 'scenario',
    title: scenario.name,
    subtitle: `${scenario.domain} · ${scenario.variables.length} variables`,
    keywords: [scenario.description, scenario.domain, ...scenario.tags].join(' '),
    scenarioId: scenario.id,
    refId: scenario.id,
  };
  const variables: SearchDocument[] = scenario.variables.map((variable: VariableDefinition) => ({
    id: `variable:${scenario.id}:${variable.id}`,
    kind: 'variable',
    title: variable.name || variable.key,
    subtitle: `${scenario.name} · ${variable.tags?.join(', ') || variable.type}`,
    keywords: [variable.key, variable.description, variable.unit, ...(variable.tags ?? []), scenario.name].filter(Boolean).join(' '),
    scenarioId: scenario.id,
    refId: variable.id,
  }));
  const events: SearchDocument[] = scenario.events.map((event: SimulationEvent) => ({
    id: `event:${scenario.id}:${event.id}`,
    kind: 'event',
    title: event.name,
    subtitle: `${scenario.name} · ${event.severity}`,
    keywords: [event.description, event.trigger?.kind, scenario.name].filter(Boolean).join(' '),
    scenarioId: scenario.id,
    refId: event.id,
  }));
  const rules: SearchDocument[] = scenario.rules.map((rule) => ({
    id: `rule:${scenario.id}:${rule.id}`,
    kind: 'rule',
    title: rule.name,
    subtitle: `${scenario.name} · priority ${rule.priority}`,
    keywords: [rule.description, rule.category, scenario.name].filter(Boolean).join(' '),
    scenarioId: scenario.id,
    refId: rule.id,
  }));
  return [scenarioDoc, ...variables, ...events, ...rules];
}

export function buildSearchIndex(scenarios: readonly Scenario[], engine: SimulationEngine | null): SearchDocument[] {
  const documents = scenarios.flatMap(scenarioDocuments);
  if (!engine) return documents;
  const branches: SearchDocument[] = engine.branchesList.map((branch) => ({
    id: `branch:${branch.id}`,
    kind: 'branch',
    title: branch.name,
    subtitle: `${engine.scenario.name} · step ${branch.currentState.step}`,
    keywords: [branch.description, branch.status, engine.scenario.name].filter(Boolean).join(' '),
    scenarioId: engine.scenario.id,
    refId: branch.id,
  }));
  return [...documents, ...branches];
}

function scoreDocument(document: SearchDocument, terms: readonly string[]): number {
  const title = document.title.toLowerCase();
  const subtitle = document.subtitle.toLowerCase();
  const keywords = document.keywords.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 8;
    if (subtitle.includes(term)) score += 3;
    if (keywords.includes(term)) score += 2;
  }
  return score;
}

export function searchDocuments(documents: readonly SearchDocument[], query: string, limit = 30): SearchHit[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return documents
    .map((document) => ({ document, score: scoreDocument(document, terms) }))
    .filter((hit) => hit.score > 0)
    .sort((left, right) => right.score - left.score || left.document.title.localeCompare(right.document.title))
    .slice(0, limit);
}
