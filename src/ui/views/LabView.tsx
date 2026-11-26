import { Activity, GitBranch, Plus, Save } from 'lucide-react';
import { useParadox } from '@/state/store';
import { Button } from '@/ui/components/Button';
import { EventConsole } from '@/ui/components/EventConsole';
import { MetricCard } from '@/ui/components/MetricCard';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { SimulationControls } from '@/ui/components/SimulationControls';
import { VariableTable } from '@/ui/components/VariableTable';
import { EmptyState } from '@/ui/components/EmptyState';

export function LabView() {
  const engine = useParadox((state) => state.engine);
  useParadox((state) => state.revision);
  const openModal = useParadox((state) => state.openModal);
  const captureSnapshot = useParadox((state) => state.captureSnapshot);
  if (!engine) return <EmptyState title="No active scenario" description="Load a preset from the scenario library to begin simulating." />;
  const state = engine.activeBranch.currentState;
  const changes = state.changes.length;
  const events = state.eventHistory.length;

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Simulation laboratory"
        title={engine.scenario.name}
        description="Run the rule engine, inspect variable transitions and inject events into the live world state."
        actions={<>
          <Button icon={<GitBranch size={13} />} onClick={() => openModal({ kind: 'newBranch' })}>Branch</Button>
          <Button icon={<Plus size={13} />} onClick={() => openModal({ kind: 'injectEvent' })}>Inject event</Button>
          <Button icon={<Save size={13} />} onClick={() => captureSnapshot(`Lab checkpoint ${state.step}`)}>Snapshot</Button>
        </>}
      />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricCard label="Simulation time" value={state.time.toFixed(1)} unit="t" />
        <MetricCard label="Variables" value={engine.definitions.length} />
        <MetricCard label="Events fired" value={events} delta={events > 0 ? events : undefined} />
        <MetricCard label="Changes" value={changes} hint="in current state" />
      </div>
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <Panel title="Controls" subtitle="Engine state"><SimulationControls /></Panel>
        <Panel title="Variable explorer" subtitle="Live world state" bodyClassName="p-0"><VariableTable /></Panel>
        <div className="flex min-h-0 flex-col gap-3">
          <Panel title="Branch state" className="min-h-[140px]">
            <dl className="space-y-2 font-mono text-[11px]">
              <div className="flex justify-between"><dt className="text-muted">Active reality</dt><dd className="text-cyan">{engine.activeBranch.name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Parent</dt><dd className="text-chalk/80">{engine.getBranch(engine.activeBranch.parentId ?? '')?.name ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Divergence</dt><dd className="text-chalk/80">{engine.activeBranch.branchPointStep}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Status</dt><dd className="text-chalk/80">{engine.activeBranch.status}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Realities</dt><dd className="text-chalk/80">{engine.branchesList.length}</dd></div>
            </dl>
          </Panel>
          <Panel title="Console" subtitle="Actual engine activity" className="min-h-[180px] flex-1" bodyClassName="p-0"><EventConsole /></Panel>
        </div>
      </div>
      <p className="flex items-center gap-2 font-mono text-[9px] text-muted/70"><Activity size={11} /> All values are computed locally from the scenario rule set.</p>
    </div>
  );
}
