import { useEffect, useState } from 'react';
import { Database, Gauge, Keyboard } from 'lucide-react';
import { useParadox } from '@/state/store';
import type { PanelId } from '@/state/types';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { MetricCard } from '@/ui/components/MetricCard';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { Slider } from '@/ui/components/Slider';
import { Toggle } from '@/ui/components/Toggle';

const PANELS: readonly { id: PanelId; label: string; description: string }[] = [
  { id: 'navigator', label: 'Navigator', description: 'Left-hand navigation and view switcher' },
  { id: 'inspector', label: 'Inspector', description: 'Contextual details for the current selection' },
  { id: 'console', label: 'Console', description: 'Engine activity and event log' },
  { id: 'controls', label: 'Controls', description: 'Playback and simulation controls' },
];

const SHORTCUTS: readonly { keys: string; action: string }[] = [
  { keys: 'Ctrl+K', action: 'Open the command palette' },
  { keys: 'Space', action: 'Play or pause the simulation' },
  { keys: 'Arrow keys', action: 'Step between states; move through palette results' },
  { keys: 'Escape', action: 'Close a dialog or the command palette' },
];

export function SettingsView() {
  const workspaceName = useParadox((state) => state.workspace.name);
  const workspaceId = useParadox((state) => state.workspace.id);
  const renameWorkspace = useParadox((state) => state.renameWorkspace);
  const reducedMotion = useParadox((state) => state.reducedMotion);
  const showGrid = useParadox((state) => state.showGrid);
  const toggleReducedMotion = useParadox((state) => state.toggleReducedMotion);
  const toggleGrid = useParadox((state) => state.toggleGrid);
  const panels = useParadox((state) => state.panels);
  const togglePanel = useParadox((state) => state.togglePanel);
  const panelSizes = useParadox((state) => state.panelSizes);
  const setPanelSize = useParadox((state) => state.setPanelSize);
  const speed = useParadox((state) => state.speed);
  const setSpeed = useParadox((state) => state.setSpeed);
  const pushToast = useParadox((state) => state.pushToast);
  const scenarios = useParadox((state) => state.scenarios);
  const [name, setName] = useState(workspaceName);

  useEffect(() => setName(workspaceName), [workspaceName]);

  const trimmed = name.trim();
  const saveName = (): void => {
    if (!trimmed) {
      pushToast('Workspace name cannot be empty', 'warning');
      return;
    }
    renameWorkspace(trimmed);
    pushToast('Workspace name updated', 'success');
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Local preferences"
        title="Settings"
        description="Tune the laboratory to your workflow. Every setting here is applied through the store and stays local to this browser."
        actions={<Badge tone="success">Fully local / browser-only</Badge>}
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricCard label="Workspace" value={workspaceName} />
        <MetricCard label="Playback speed" value={speed.toFixed(2)} unit="x" />
        <MetricCard label="Scenarios" value={scenarios.length} />
        <MetricCard label="Visible panels" value={PANELS.filter((panel) => panels[panel.id]).length} />
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-auto lg:grid-cols-2">
        <div className="flex min-h-0 flex-col gap-3">
          <Panel title="Workspace" subtitle="Local-only identity" bodyClassName="space-y-2 p-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Workspace name</span>
              <input
                aria-label="Workspace name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') saveName(); }}
                className="h-8 w-full border border-line bg-void px-2 font-mono text-xs text-chalk outline-none focus:border-cyan/60"
              />
            </label>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[9px] text-muted/70">ID: {workspaceId}</span>
              <Button variant="solid" disabled={!trimmed || trimmed === workspaceName} onClick={saveName}>Save name</Button>
            </div>
          </Panel>

          <Panel title="Display" subtitle="Local-only presentation preferences" bodyClassName="divide-y divide-line/50 px-3">
            <Toggle label="Reduced motion" checked={reducedMotion} onChange={() => toggleReducedMotion()} description="Minimize interface animation; saved only in this browser." />
            <Toggle label="Show grid" checked={showGrid} onChange={() => toggleGrid()} description="Display the measurement grid in visual views; local-only." />
          </Panel>

          <Panel title="Playback" subtitle="Simulation speed" bodyClassName="space-y-3 p-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted"><Gauge size={12} /> Steps advance faster at higher speeds</div>
            <Slider label="Playback speed" value={speed} min={0.25} max={16} step={0.25} unit="x" onChange={setSpeed} />
            <p className="text-[11px] leading-relaxed text-muted">Speed affects only this session's playback loop; it is not sent anywhere.</p>
          </Panel>
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <Panel title="Panels" subtitle="Local-only layout visibility" bodyClassName="divide-y divide-line/50 px-3">
            {PANELS.map((panel) => (
              <Toggle
                key={panel.id}
                label={`Show ${panel.label}`}
                checked={panels[panel.id]}
                onChange={() => togglePanel(panel.id)}
                description={panel.description}
              />
            ))}
          </Panel>

          <Panel title="Panel sizing" subtitle="Local-only layout dimensions" bodyClassName="space-y-3 p-3">
            {PANELS.map((panel) => (
              <Slider
                key={panel.id}
                label={`${panel.label} width`}
                value={panelSizes[panel.id] ?? 180}
                min={180}
                max={520}
                step={4}
                unit="px"
                onChange={(value) => setPanelSize(panel.id, value)}
              />
            ))}
          </Panel>

          <Panel title="Accessibility & shortcuts" subtitle="Keyboard-first navigation" bodyClassName="space-y-2 p-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted"><Keyboard size={12} /> Shortcut reference</div>
            <ul className="space-y-1.5">
              {SHORTCUTS.map((shortcut) => (
                <li key={shortcut.keys} className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-chalk/80">{shortcut.action}</span>
                  <kbd className="border border-line bg-void px-1.5 py-0.5 font-mono text-[10px] text-cyan">{shortcut.keys}</kbd>
                </li>
              ))}
            </ul>
            <p className="text-[11px] leading-relaxed text-muted">Reduced motion disables animation, and all controls remain reachable by keyboard and screen reader labels.</p>
          </Panel>

          <Panel title="Privacy & local data" subtitle="No server, no account, no sync" bodyClassName="space-y-2 p-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted"><Database size={12} /> Browser-only simulation</div>
            <p className="text-[11px] leading-relaxed text-muted">
              PARADOX is fully local and browser-only. Scenarios, history and snapshots are computed in this tab; preferences and workspace details
              shown here are persisted locally in this browser only. Nothing is uploaded, there is no account or cloud sync, and clearing this
              site's data removes the locally persisted values.
            </p>
            <p className="text-[11px] leading-relaxed text-muted/70">
              This panel never calls persistence APIs directly: every change goes through a store action.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
