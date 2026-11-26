import { Clock3, GitBranch, Layers3, Plus } from 'lucide-react';
import type { RealityStatus } from '@/engine/types';
import { useParadox } from '@/state/store';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { MetricCard } from '@/ui/components/MetricCard';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { formatDelta, formatValue } from '@/utils/format';

type Tone = 'neutral' | 'cyan' | 'violet' | 'amber' | 'danger' | 'success';

function statusTone(status: RealityStatus): Tone {
  switch (status) {
    case 'running': return 'cyan';
    case 'complete': return 'success';
    case 'paused': return 'amber';
    case 'archived': return 'neutral';
    case 'idle': return 'violet';
  }
}

export function ExplorerView() {
  const engine = useParadox((state) => state.engine);
  useParadox((state) => state.revision);
  const selection = useParadox((state) => state.selection);
  const setSelection = useParadox((state) => state.setSelection);
  const selectBranch = useParadox((state) => state.selectBranch);
  const openModal = useParadox((state) => state.openModal);
  const setView = useParadox((state) => state.setView);

  if (!engine) {
    return <EmptyState title="No realities" description="Load a scenario to explore its branch tree and divergence points." />;
  }

  const branches = engine.branchesList;
  const selected = engine.getBranch(selection.branchId ?? '') ?? engine.activeBranch;
  const parent = selected.parentId ? engine.getBranch(selected.parentId) : undefined;
  const children = branches.filter((branch) => branch.parentId === selected.id);
  const divergenceEvent = engine.scenario.events.find((event) => event.id === selected.divergenceEventId);
  const divergenceState = engine.getStateAt(selected.id, selected.branchPointStep) ?? selected.initialState;
  const currentState = selected.currentState;

  const activate = (): void => { selectBranch(selected.id); };
  const openBranchModal = (): void => { selectBranch(selected.id); openModal({ kind: 'newBranch' }); };
  const openView = (view: 'compare' | 'timeline'): void => { selectBranch(selected.id); setView(view); };

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Reality explorer"
        title="Multiverse branches"
        description="Every reality is recorded by the engine with its parent, divergence point and independent state trajectory."
        actions={
          <>
            <Button icon={<GitBranch size={13} />} onClick={openBranchModal}>New reality</Button>
            <Button icon={<Layers3 size={13} />} onClick={() => openView('compare')}>Compare</Button>
            <Button icon={<Clock3 size={13} />} onClick={() => openView('timeline')}>Timeline</Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricCard label="Realities" value={branches.length} />
        <MetricCard label="Root branches" value={branches.filter((branch) => !branch.parentId).length} />
        <MetricCard label="Child branches" value={branches.filter((branch) => branch.parentId !== undefined).length} />
        <MetricCard label="Selected step" value={currentState.step} />
      </div>
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Panel title="Branch tree" subtitle={`${branches.length} recorded realities`} bodyClassName="p-0">
          <div className="space-y-1 p-2">
            {branches.map((branch) => {
              const branchParent = branch.parentId ? engine.getBranch(branch.parentId) : undefined;
              const childCount = branches.filter((item) => item.parentId === branch.id).length;
              const active = branch.id === engine.activeBranchId;
              const focused = branch.id === selected.id;
              return (
                <div
                  key={branch.id}
                  className={`border p-2 ${focused ? 'border-cyan/60 bg-cyan/[0.06]' : 'border-line/50 bg-void/30'}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelection({ branchId: branch.id })}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 border border-white/20" style={{ backgroundColor: branch.color }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-chalk/90">{branch.name}</span>
                    {active && <Badge tone="success">Active</Badge>}
                    <Badge tone={statusTone(branch.status)}>{branch.status}</Badge>
                  </button>
                  <p className="mt-1 pl-[18px] font-mono text-[9px] text-muted">
                    {branchParent ? `from ${branchParent.name}` : 'prime reality'} · step {branch.currentState.step}
                    {childCount > 0 ? ` · ${childCount} child${childCount > 1 ? 'ren' : ''}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel
          title={selected.name}
          subtitle={selected.id}
          actions={
            <>
              {selected.id === engine.activeBranchId && <Badge tone="success">Active</Badge>}
              <Button variant="solid" onClick={activate} disabled={selected.id === engine.activeBranchId}>Activate</Button>
            </>
          }
          bodyClassName="p-0"
          className="min-h-0"
        >
          <div className="space-y-3 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="h-3 w-3 border border-white/20" style={{ backgroundColor: selected.color }} aria-hidden="true" />
              <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
              {selected.parentId ? <Badge tone="violet">Child reality</Badge> : <Badge tone="cyan">Prime reality</Badge>}
              <span className="font-mono text-[10px] text-muted">seed {selected.seed}</span>
            </div>
            {selected.description && <p className="text-xs leading-relaxed text-muted">{selected.description}</p>}
            <dl className="grid gap-x-4 gap-y-1 font-mono text-[10px] sm:grid-cols-2">
              <div className="flex justify-between gap-2"><dt className="text-muted">Parent</dt><dd className="truncate text-chalk/80">{parent?.name ?? '—'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Divergence step</dt><dd className="text-chalk/80">{selected.branchPointStep}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Divergence time</dt><dd className="text-chalk/80">t={selected.branchTime.toFixed(1)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Divergence event</dt><dd className="truncate text-chalk/80">{divergenceEvent?.name ?? '—'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Current step</dt><dd className="text-cyan">{currentState.step}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Timeline entries</dt><dd className="text-chalk/80">{selected.timeline.entries.length}</dd></div>
            </dl>
            {selected.divergenceReason && <p className="font-mono text-[10px] text-muted">Reason: {selected.divergenceReason}</p>}
            <div className="border-t border-line/50 pt-2">
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted">Child realities ({children.length})</p>
              {children.length === 0 ? (
                <p className="mt-1 font-mono text-[10px] text-muted">No children branched from this reality.</p>
              ) : (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {children.map((child) => (
                    <Button key={child.id} icon={<GitBranch size={12} />} onClick={() => setSelection({ branchId: child.id })}>
                      {child.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-line/50 pt-2">
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted">Variables at divergence vs current</p>
              <table className="mt-1 w-full border-collapse text-left font-mono text-[10px]">
                <thead className="text-muted">
                  <tr><th className="py-1">Variable</th><th className="py-1">At step {selected.branchPointStep}</th><th className="py-1">Current</th><th className="py-1">Δ</th></tr>
                </thead>
                <tbody>
                  {engine.definitions.filter((definition) => {
                    const atDivergence = divergenceState.variables[definition.id];
                    const current = currentState.variables[definition.id];
                    return typeof atDivergence === 'number' && typeof current === 'number';
                  }).map((definition) => {
                    const before = divergenceState.variables[definition.id];
                    const after = currentState.variables[definition.id];
                    const beforeValue = typeof before === 'number' ? before : Number(definition.initial);
                    const afterValue = typeof after === 'number' ? after : beforeValue;
                    return (
                      <tr key={definition.id} className="border-t border-line/30">
                        <td className="py-1 text-chalk/80">{definition.key}</td>
                        <td className="py-1 text-muted">{formatValue(beforeValue, definition.unit)}</td>
                        <td className="py-1 text-cyan">{formatValue(afterValue, definition.unit)}</td>
                        <td className="py-1 text-chalk/70">{formatDelta(afterValue - beforeValue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line/50 pt-3">
              <Button icon={<Plus size={13} />} onClick={openBranchModal}>Branch from here</Button>
              <Button icon={<Layers3 size={13} />} onClick={() => openView('compare')}>Compare realities</Button>
              <Button icon={<Clock3 size={13} />} onClick={() => openView('timeline')}>View timeline</Button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
