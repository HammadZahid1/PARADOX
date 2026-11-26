import type {
  CausalGraph, EntityId, EventRecord, HistoryEntry, RealityBranch,
  Scenario, SimulationEvent, TimelineSnapshot, VariableChange, VariableDefinition, WorldState,
} from '@/engine/types';
import { advanceClock, createInitialState } from '@/engine/core/state';
import { applyRules } from '@/engine/core/rules';
import { diffVariables, setVariable } from '@/engine/core/variables';
import { SeededRandom } from '@/engine/random/rng';
import { EventEngine } from '@/engine/events/engine';
import { buildGraphFromDefinitions } from '@/engine/causal/graph';
import { applyPendingPropagations, propagateChange, type PendingPropagation } from '@/engine/causal/propagation';
import { createHistoryEntry } from '@/engine/timeline/history';
import { appendTimelineEntry } from '@/engine/timeline/timeline';
import { createSnapshot, restoreSnapshot } from '@/engine/timeline/snapshots';
import { branchFromState, chooseBranchColor, createReality } from '@/engine/reality/branch';
import { createId } from '@/utils/id';
import type { ConsoleEntry, ConsoleKind, StepResult } from './types';

export interface SimulationEngineOptions {
  causalGraph?: CausalGraph;
  consoleCapacity?: number;
}

/** Orchestrates rules, events, causal propagation, timeline and branch state. */
export class SimulationEngine {
  readonly scenario: Scenario;
  readonly definitions: readonly VariableDefinition[];
  readonly causalGraph: CausalGraph;
  private readonly eventEngine = new EventEngine();
  private readonly consoleCapacity: number;
  private branches = new Map<EntityId, RealityBranch>();
  private snapshots = new Map<EntityId, TimelineSnapshot>();
  private history: HistoryEntry[] = [];
  private logs: ConsoleEntry[] = [];
  private pending: PendingPropagation[] = [];
  private activatedQueue: EntityId[] = [];
  activeBranchId: EntityId;

  constructor(scenario: Scenario, options: SimulationEngineOptions = {}) {
    this.scenario = scenario;
    this.definitions = scenario.variables;
    this.causalGraph = options.causalGraph ?? buildGraphFromDefinitions(scenario.name, scenario.variables, scenario.events);
    this.consoleCapacity = options.consoleCapacity ?? 500;
    const initial = createInitialState({
      definitions: scenario.variables, seed: scenario.configuration.seed, parameters: scenario.parameters,
    });
    const branch = createReality({ name: 'Prime Reality', state: initial, seed: scenario.configuration.seed, index: 0 });
    branch.status = 'idle';
    this.branches.set(branch.id, branch);
    this.activeBranchId = branch.id;
    this.log('init', `Scenario initialized: ${scenario.name} (${scenario.variables.length} variables, ${scenario.events.length} events)`, 'notice');
    this.recordHistory('scenario', `Loaded scenario ${scenario.name}`);
  }

  get activeBranch(): RealityBranch {
    const branch = this.branches.get(this.activeBranchId);
    if (!branch) throw new Error('No active reality');
    return branch;
  }

  get branchesList(): RealityBranch[] {
    return [...this.branches.values()];
  }

  get snapshotsList(): TimelineSnapshot[] {
    return [...this.snapshots.values()];
  }

  get historyList(): readonly HistoryEntry[] {
    return this.history;
  }

  get consoleEntries(): readonly ConsoleEntry[] {
    return this.logs;
  }

  getBranch(id: EntityId): RealityBranch | undefined {
    return this.branches.get(id);
  }

  selectBranch(id: EntityId): boolean {
    if (!this.branches.has(id)) return false;
    this.activeBranchId = id;
    this.log('control', `Selected reality ${this.activeBranch.name}`);
    return true;
  }

  step(): StepResult {
    const branch = this.activeBranch;
    const config = this.scenario.configuration;
    const stepNumber = branch.currentState.step + 1;
    branch.status = 'running';
    const random = new SeededRandom((branch.seed + Math.imul(stepNumber, 0x9e3779b9)) >>> 0);
    const advanced = advanceClock(branch.currentState, config.stepDuration);
    const ruled = applyRules(advanced, this.scenario.rules, this.definitions, 'step');
    const effectiveEvents = this.scenario.events.filter((event) => !this.activatedQueue.includes(event.id));
    this.activatedQueue = [];
    const eventResult = this.eventEngine.processStep(ruled.state, effectiveEvents, this.definitions, random, stepNumber, config.mode);

    let state = eventResult.state;
    const propagated: VariableChange[] = [];
    const due = applyPendingPropagations(state, this.pending, state.step, this.causalGraph, this.definitions);
    state = due.state;
    this.pending = this.pending.filter((item) => item.dueStep > state.step);
    if (config.propagationLimit > 0) {
      const changed = diffVariables(ruled.state, state, this.definitions);
      for (const change of changed) {
        const definition = this.definitions.find((item) => item.id === change.variableId);
        if (!definition || typeof change.to !== 'number' || typeof change.from !== 'number') continue;
        const result = propagateChange(this.causalGraph, state, definition.key, change.to - change.from, this.definitions, config.propagationLimit);
        state = result.state;
        this.pending.push(...result.pending);
        propagated.push(...result.steps.map((item) => ({
          variableId: item.toNode, from: item.before, to: item.after,
          step: state.step, time: state.time, source: 'causal',
          reason: `${item.relation}:${item.edgeId}`,
        })));
      }
    }
    state = {
      ...state,
      metrics: {
        ...state.metrics,
        totalChanges: (state.metrics.totalChanges ?? 0) + ruled.changes.length + propagated.length,
        activeEvents: state.activeEvents.length,
      },
    };
    const changes = diffVariables(branch.currentState, state, this.definitions);
    const checkpoint = config.autoSnapshotSteps > 0 && state.step % config.autoSnapshotSteps === 0;
    const timeline = appendTimelineEntry(branch.timeline, state, changes, eventResult.fired, checkpoint);
    const updated: RealityBranch = { ...branch, currentState: state, timeline, status: stepNumber >= config.maxSteps ? 'complete' : 'running' };
    this.branches.set(branch.id, updated);

    let snapshotId: string | undefined;
    if (checkpoint) snapshotId = this.captureSnapshot(`Automatic checkpoint ${state.step}`, 'auto').id;
    this.recordHistory('step', `Step ${state.step} completed: ${changes.length} variables changed`, undefined, state);
    for (const event of eventResult.fired) {
      this.recordHistory('event', `${event.eventName} fired`, event.description, state);
      this.log('event', `${event.eventName} fired at step ${event.step} affecting ${event.affectedVariables.length} variables`, event.severity === 'critical' ? 'critical' : event.severity === 'warning' ? 'warning' : 'notice');
    }
    if (eventResult.logs.length > 0) this.log('event', eventResult.logs.join(' | '));
    if (propagated.length > 0) this.log('causal', `Causal propagation completed: ${propagated.length} variable updates`);
    this.activatedQueue.push(...eventResult.activated);
    for (const cancelled of eventResult.cancelled) this.log('control', `Event cancellation requested: ${cancelled}`, 'notice');
    return { state, changes, fired: eventResult.fired, propagation: propagated, branchId: branch.id, snapshotId };
  }

  run(steps = this.scenario.configuration.maxSteps, onProgress?: (completed: number, total: number) => void, shouldCancel?: () => boolean): StepResult[] {
    const results: StepResult[] = [];
    for (let index = 0; index < steps; index += 1) {
      if (shouldCancel?.()) break;
      results.push(this.step());
      onProgress?.(index + 1, steps);
    }
    this.log('control', `Batch simulation finished after ${results.length} steps`);
    return results;
  }

  injectEvent(event: SimulationEvent, probabilityOverride?: number): StepResult {
    const branch = this.activeBranch;
    const random = new SeededRandom((branch.seed + Math.imul(branch.currentState.step + 1, 0x85ebca6b)) >>> 0);
    const effective = probabilityOverride === undefined ? event : { ...event, probability: probabilityOverride };
    const result = this.eventEngine.inject(effective, branch.currentState, this.definitions, random, this.scenario.configuration.mode);
    if (result.fired.length === 0) {
      this.log('probability', `Injected event ${event.name} was not selected`, 'notice');
      return { state: branch.currentState, changes: [], fired: [], propagation: [], branchId: branch.id };
    }
    let state = result.state;
    const propagating = diffVariables(branch.currentState, state, this.definitions);
    const causalSteps: VariableChange[] = [];
    for (const change of propagating) {
      const definition = this.definitions.find((item) => item.id === change.variableId);
      if (!definition || typeof change.from !== 'number' || typeof change.to !== 'number') continue;
      const propagation = propagateChange(this.causalGraph, state, definition.key, change.to - change.from, this.definitions, this.scenario.configuration.propagationLimit);
      state = propagation.state;
      causalSteps.push(...propagation.steps.map((item) => ({
        variableId: item.toNode, from: item.before, to: item.after, step: state.step, time: state.time, source: 'causal',
      })));
    }
    const changes = diffVariables(branch.currentState, state, this.definitions);
    const timeline = appendTimelineEntry(branch.timeline, state, changes, result.fired, false);
    const updated = { ...branch, currentState: state, timeline };
    this.branches.set(branch.id, updated);
    this.recordHistory('event', `Injected ${event.name}`, undefined, state);
    this.log('event', `Event ${event.name} injected and applied`);
    return { state, changes, fired: result.fired, propagation: causalSteps.map((item) => ({
      edgeId: 'injected', fromNode: '', toNode: item.variableId, before: item.from as number, after: item.to as number,
      depth: 1, relation: 'influences', strength: 0,
    })), branchId: branch.id };
  }

  adjustVariable(key: string, value: number, source = 'user'): boolean {
    const definition = this.definitions.find((item) => item.key === key);
    if (!definition) return false;
    const branch = this.activeBranch;
    const applied = setVariable(branch.currentState, definition, value, source);
    if (!applied.change) return false;
    let state = applied.state;
    const propagation = propagateChange(this.causalGraph, state, key, Number(applied.change.to) - Number(applied.change.from), this.definitions, this.scenario.configuration.propagationLimit);
    state = propagation.state;
    this.branches.set(branch.id, { ...branch, currentState: state });
    this.log('variable', `${key} changed from ${String(applied.change.from)} to ${String(applied.change.to)}`, 'notice');
    this.recordHistory('variable', `${key} adjusted to ${String(applied.change.to)}`, undefined, state);
    return true;
  }

  captureSnapshot(name: string, kind: TimelineSnapshot['kind'] = 'manual', description?: string): TimelineSnapshot {
    const branch = this.activeBranch;
    const snapshot = createSnapshot(branch.currentState, branch.id, name, kind, description);
    this.snapshots.set(snapshot.id, snapshot);
    const timeline = { ...branch.timeline, snapshots: [...branch.timeline.snapshots, snapshot] };
    this.branches.set(branch.id, { ...branch, timeline });
    this.recordHistory('snapshot', `Snapshot saved: ${name}`, undefined, branch.currentState);
    this.log('snapshot', `Snapshot saved: ${name}`, 'notice');
    return snapshot;
  }

  restoreSnapshot(id: EntityId): boolean {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) return false;
    const state = restoreSnapshot(snapshot);
    const branch = this.activeBranch;
    this.branches.set(branch.id, { ...branch, currentState: state });
    this.recordHistory('restoration', `Restored snapshot ${snapshot.name}`, undefined, state);
    this.log('control', `Restored snapshot ${snapshot.name}`, 'notice');
    return true;
  }

  deleteSnapshot(id: EntityId): boolean {
    const deleted = this.snapshots.delete(id);
    if (deleted) this.log('control', 'Snapshot deleted', 'notice');
    return deleted;
  }

  createBranch(name: string, fromSnapshotId?: EntityId, reason = 'manual', eventId?: EntityId): RealityBranch | undefined {
    const parent = this.activeBranch;
    let baseState = parent.currentState;
    if (fromSnapshotId) {
      const snapshot = this.snapshots.get(fromSnapshotId);
      if (!snapshot) return undefined;
      baseState = restoreSnapshot(snapshot.state);
    }
    const branch = branchFromState(parent, baseState, name, reason, eventId);
    branch.seed = (parent.seed + this.branches.size * 0x9e3779b9) >>> 0;
    branch.color = chooseBranchColor(this.branches.size);
    this.branches.set(branch.id, branch);
    this.recordHistory('branch', `Created reality ${name}`, `from ${parent.name} at step ${baseState.step}`, baseState);
    this.log('branch', `Reality branch created: ${name}`, 'notice');
    return branch;
  }

  reset(): void {
    const config = this.scenario.configuration;
    const initial = createInitialState({ definitions: this.definitions, seed: config.seed, parameters: this.scenario.parameters });
    const prime = createReality({ name: 'Prime Reality', state: initial, seed: config.seed, index: 0 });
    this.branches = new Map([[prime.id, prime]]);
    this.snapshots.clear();
    this.history = [];
    this.pending = [];
    this.activatedQueue = [];
    this.activeBranchId = prime.id;
    this.log('control', 'Simulation reset to initial state', 'notice');
  }

  getConsole(filter?: { kind?: ConsoleKind; branchId?: EntityId; query?: string }): ConsoleEntry[] {
    const query = filter?.query?.toLowerCase();
    return this.logs.filter((entry) => {
      if (filter?.kind && entry.kind !== filter.kind) return false;
      if (filter?.branchId && entry.branchId !== filter.branchId) return false;
      if (query && !entry.message.toLowerCase().includes(query)) return false;
      return true;
    });
  }

  private log(kind: ConsoleKind, message: string, severity: ConsoleEntry['severity'] = 'info'): void {
    this.logs.push({
      id: createId('log'), step: this.activeBranch?.currentState.step ?? 0,
      time: this.activeBranch?.currentState.time ?? 0, kind, message, severity,
      branchId: this.activeBranchId, timestamp: Date.now(),
    });
    if (this.logs.length > this.consoleCapacity) this.logs = this.logs.slice(-this.consoleCapacity);
  }

  private recordHistory(kind: HistoryEntry['kind'], summary: string, detail?: string, state?: WorldState): void {
    const source = state ?? this.activeBranch?.currentState;
    this.history.push(createHistoryEntry(kind, summary, this.activeBranchId, source?.step ?? 0, source?.time ?? 0, detail));
  }
}
