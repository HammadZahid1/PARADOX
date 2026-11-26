import { useParadox } from '@/state/store';
import type { ViewId } from '@/state/types';

export interface Command {
  id: string;
  label: string;
  group: string;
  shortcut?: string;
  run: () => void;
}

export function buildCommands(): Command[] {
  const state = useParadox.getState();
  const view = (id: ViewId, label: string): Command => ({ id: `view-${id}`, label, group: 'Navigate', run: () => useParadox.getState().setView(id) });
  return [
    { id: 'new-scenario', label: 'New scenario', group: 'Scenario', shortcut: 'N', run: () => useParadox.getState().openModal({ kind: 'newScenario' }) },
    { id: 'new-branch', label: 'Create reality branch', group: 'Reality', shortcut: 'B', run: () => useParadox.getState().openModal({ kind: 'newBranch' }) },
    { id: 'inject-event', label: 'Inject event', group: 'Event', shortcut: 'E', run: () => useParadox.getState().openModal({ kind: 'injectEvent' }) },
    { id: 'start', label: 'Start simulation', group: 'Simulation', shortcut: 'Space', run: () => useParadox.getState().play() },
    { id: 'pause', label: 'Pause simulation', group: 'Simulation', run: () => useParadox.getState().pause() },
    { id: 'step', label: 'Step forward', group: 'Simulation', shortcut: '→', run: () => useParadox.getState().stepForward() },
    { id: 'reset', label: 'Reset simulation', group: 'Simulation', run: () => useParadox.getState().reset() },
    { id: 'snapshot', label: 'Create snapshot', group: 'Timeline', shortcut: 'S', run: () => useParadox.getState().openModal({ kind: 'snapshot' }) },
    { id: 'compare', label: 'Compare realities', group: 'Reality', run: () => useParadox.getState().setView('compare') },
    { id: 'visualization', label: 'Switch visualization', group: 'View', run: () => useParadox.getState().setView(state.view === 'universe' ? 'timeline' : 'universe') },
    { id: 'settings', label: 'Open settings', group: 'View', run: () => useParadox.getState().setView('settings') },
    view('lab', 'Open simulation lab'),
    view('timeline', 'Open branching timeline'),
    view('universe', 'Open 3D reality universe'),
    view('causal', 'Open causal graph'),
    view('analytics', 'Open analytics'),
    view('scenarios', 'Open scenario library'),
    view('world', 'Open world editor'),
    view('events', 'Open event lab'),
    view('explorer', 'Open reality explorer'),
    view('history', 'Open simulation history'),
    view('monte', 'Open Monte Carlo lab'),
  ];
}
