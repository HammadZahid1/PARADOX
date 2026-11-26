import { create } from 'zustand';
import type { EntityId, Scenario, SimulationEvent, Workspace } from '@/engine/types';
import { SimulationEngine } from '@/engine/simulation/engine';
import { createId } from '@/utils/id';
import type { ModalState, PanelId, SelectionState, ToastMessage, ViewId } from './types';

interface ParadoxStore {
  engine: SimulationEngine | null;
  workspace: Workspace;
  scenarios: Scenario[];
  revision: number;
  view: ViewId;
  panels: Record<PanelId, boolean>;
  panelSizes: Record<PanelId, number>;
  selection: SelectionState;
  isPlaying: boolean;
  speed: number;
  replayStep: number;
  graphLayout: 'hierarchical' | 'radial' | 'circular' | 'force';
  commandOpen: boolean;
  searchOpen: boolean;
  modal: ModalState;
  toasts: ToastMessage[];
  reducedMotion: boolean;
  showGrid: boolean;

  bootstrap: (scenarios: Scenario[]) => void;
  loadScenario: (id: EntityId) => void;
  registerScenarios: (scenarios: Scenario[]) => void;
  setEngine: (engine: SimulationEngine) => void;
  tick: () => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  runBatch: (steps: number) => void;
  setSpeed: (speed: number) => void;
  reset: () => void;
  injectEvent: (event: SimulationEvent) => void;
  adjustVariable: (key: string, value: number) => void;
  createBranch: (name: string) => void;
  selectBranch: (id: EntityId) => void;
  captureSnapshot: (name: string) => void;
  restoreSnapshot: (id: EntityId) => void;
  setView: (view: ViewId) => void;
  togglePanel: (panel: PanelId) => void;
  setPanelSize: (panel: PanelId, size: number) => void;
  setSelection: (selection: Partial<SelectionState>) => void;
  setGraphLayout: (layout: 'hierarchical' | 'radial' | 'circular' | 'force') => void;
  setCommandOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  pushToast: (message: string, severity?: ToastMessage['severity']) => void;
  dismissToast: (id: string) => void;
  toggleReducedMotion: () => void;
  toggleGrid: () => void;
  renameWorkspace: (name: string) => void;
}

const defaultWorkspace = (): Workspace => ({
  id: 'workspace_default',
  name: 'Primary Laboratory',
  description: 'Local simulation workspace',
  scenarioIds: [],
  settings: { compactMode: false, reducedMotion: false, showGrid: true, defaultView: 'universe', theme: 'void', panelSizes: {} },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1,
});

export const useParadox = create<ParadoxStore>((set, get) => ({
  engine: null,
  workspace: defaultWorkspace(),
  scenarios: [],
  revision: 0,
  view: 'universe',
  panels: { navigator: true, inspector: true, console: true, controls: true },
  panelSizes: { navigator: 248, inspector: 304, console: 200, controls: 280 },
  selection: {},
  isPlaying: false,
  speed: 1,
  replayStep: 0,
  graphLayout: 'hierarchical',
  commandOpen: false,
  searchOpen: false,
  modal: { kind: null },
  toasts: [],
  reducedMotion: false,
  showGrid: true,

  bootstrap: (scenarios) => {
    const workspace = get().workspace;
    const scenario = scenarios[0];
    const engine = scenario ? new SimulationEngine(scenario) : null;
    set({
      scenarios,
      workspace: { ...workspace, scenarioIds: scenarios.map((item) => item.id), activeScenarioId: scenario?.id, updatedAt: Date.now() },
      engine,
      revision: get().revision + 1,
      selection: engine ? { branchId: engine.activeBranchId } : {},
    });
  },
  loadScenario: (id) => {
    const scenario = get().scenarios.find((item) => item.id === id);
    if (!scenario) return;
    const engine = new SimulationEngine(scenario);
    set({
      engine,
      workspace: { ...get().workspace, activeScenarioId: id, updatedAt: Date.now() },
      selection: { branchId: engine.activeBranchId },
      isPlaying: false,
      replayStep: 0,
      revision: get().revision + 1,
    });
    get().pushToast(`Loaded scenario: ${scenario.name}`, 'success');
  },
  registerScenarios: (scenarios) => set((state) => ({
    scenarios: [...state.scenarios, ...scenarios.filter((item) => !state.scenarios.some((existing) => existing.id === item.id))],
    revision: state.revision + 1,
  })),
  setEngine: (engine) => set((state) => ({ engine, revision: state.revision + 1 })),
  tick: () => {
    const engine = get().engine;
    if (!engine) return;
    engine.step();
    set((state) => ({ revision: state.revision + 1, replayStep: engine.activeBranch.currentState.step }));
    if (engine.activeBranch.status === 'complete') get().pause();
  },
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => { get().pause(); get().reset(); },
  stepForward: () => get().tick(),
  stepBackward: () => {
    const engine = get().engine;
    if (!engine) return;
    const step = Math.max(0, engine.activeBranch.currentState.step - 1);
    const snapshot = [...engine.snapshotsList].reverse().find((item) => item.step <= step);
    if (snapshot) engine.restoreSnapshot(snapshot.id);
    set((state) => ({ revision: state.revision + 1, replayStep: step }));
  },
  runBatch: (steps) => {
    const engine = get().engine;
    if (!engine) return;
    engine.run(steps);
    set((state) => ({ revision: state.revision + 1 }));
    get().pushToast(`Completed ${steps} simulation steps`, 'success');
  },
  setSpeed: (speed) => set({ speed: Math.max(0.25, Math.min(16, speed)) }),
  reset: () => {
    get().engine?.reset();
    set((state) => ({ revision: state.revision + 1, isPlaying: false, replayStep: 0 }));
  },
  injectEvent: (event) => {
    get().engine?.injectEvent(event);
    set((state) => ({ revision: state.revision + 1 }));
    get().pushToast(`Injected event: ${event.name}`, 'info');
  },
  adjustVariable: (key, value) => {
    const ok = get().engine?.adjustVariable(key, value);
    set((state) => ({ revision: state.revision + 1 }));
    if (!ok) get().pushToast(`Unknown variable: ${key}`, 'warning');
  },
  createBranch: (name) => {
    const branch = get().engine?.createBranch(name);
    set((state) => ({ revision: state.revision + 1, selection: { ...state.selection, branchId: branch?.id ?? state.selection.branchId } }));
    if (branch) get().pushToast(`Created reality: ${name}`, 'success');
  },
  selectBranch: (id) => {
    get().engine?.selectBranch(id);
    set((state) => ({ revision: state.revision + 1, selection: { ...state.selection, branchId: id } }));
  },
  captureSnapshot: (name) => {
    get().engine?.captureSnapshot(name);
    set((state) => ({ revision: state.revision + 1 }));
    get().pushToast(`Snapshot saved: ${name}`, 'success');
  },
  restoreSnapshot: (id) => {
    get().engine?.restoreSnapshot(id);
    set((state) => ({ revision: state.revision + 1 }));
    get().pushToast('Snapshot restored', 'success');
  },
  setView: (view) => set({ view }),
  togglePanel: (panel) => set((state) => ({ panels: { ...state.panels, [panel]: !state.panels[panel] } })),
  setPanelSize: (panel, size) => set((state) => ({ panelSizes: { ...state.panelSizes, [panel]: Math.max(180, Math.min(520, size)) } })),
  setSelection: (selection) => set((state) => ({ selection: { ...state.selection, ...selection } })),
  setGraphLayout: (graphLayout) => set({ graphLayout }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: { kind: null } }),
  pushToast: (message, severity = 'info') => {
    const toast: ToastMessage = { id: createId('toast'), message, severity, createdAt: Date.now() };
    set((state) => ({ toasts: [...state.toasts, toast].slice(-5) }));
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  renameWorkspace: (name) => set((state) => ({ workspace: { ...state.workspace, name, updatedAt: Date.now() } })),
}));

export function useEngineRevision(): number {
  return useParadox((state) => state.revision);
}
