import { useMemo, useState } from 'react';
import { Camera, GitBranch, RotateCcw, Trash2 } from 'lucide-react';
import type { TimelineSnapshot } from '@/engine/types';
import { useParadox } from '@/state/store';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { MetricCard } from '@/ui/components/MetricCard';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { Tabs, type TabItem } from '@/ui/components/Tabs';
import { Tooltip } from '@/ui/components/Tooltip';
import { formatValue } from '@/utils/format';

type SnapshotFilter = TimelineSnapshot['kind'] | 'all';

const FILTERS: readonly SnapshotFilter[] = ['all', 'manual', 'auto', 'branch', 'decision'];

const KIND_TONES: Record<TimelineSnapshot['kind'], 'neutral' | 'cyan' | 'violet' | 'amber' | 'success'> = {
  manual: 'cyan',
  auto: 'neutral',
  branch: 'violet',
  decision: 'success',
};

export function SnapshotsView() {
  const engine = useParadox((state) => state.engine);
  const revision = useParadox((state) => state.revision);
  const selection = useParadox((state) => state.selection);
  const setSelection = useParadox((state) => state.setSelection);
  const selectBranch = useParadox((state) => state.selectBranch);
  const openModal = useParadox((state) => state.openModal);
  const restoreSnapshot = useParadox((state) => state.restoreSnapshot);
  const pushToast = useParadox((state) => state.pushToast);
  const [filter, setFilter] = useState<SnapshotFilter>('all');

  const allSnapshots = engine?.snapshotsList ?? [];
  const visible = useMemo(
    () => allSnapshots.filter((snapshot) => filter === 'all' || snapshot.kind === filter).slice().sort((a, b) => b.createdAt - a.createdAt),
    [engine, revision, filter],
  );

  if (!engine) {
    return <EmptyState title="No snapshots" description="Load a scenario to capture local checkpoints of the live world state." />;
  }

  const activeSnapshot = allSnapshots.find((snapshot) => snapshot.id === selection.snapshotId) ?? allSnapshots.at(-1);

  const handleRestore = (snapshot: TimelineSnapshot): void => {
    selectBranch(snapshot.branchId);
    restoreSnapshot(snapshot.id);
    setSelection({ snapshotId: snapshot.id, branchId: snapshot.branchId });
  };

  const handleDelete = (snapshot: TimelineSnapshot): void => {
    const deleted = engine.deleteSnapshot(snapshot.id);
    if (!deleted) {
      pushToast('Snapshot could not be deleted', 'warning');
      return;
    }
    if (selection.snapshotId === snapshot.id) setSelection({ snapshotId: undefined });
    useParadox.setState((state) => ({ revision: state.revision + 1 }));
    pushToast(`Deleted snapshot: ${snapshot.name}`, 'success');
  };

  const renderList = (snapshots: TimelineSnapshot[]) => {
    if (snapshots.length === 0) {
      return <EmptyState title="Nothing recorded here" description="Capture a snapshot with the button above, or choose another category." />;
    }
    return (
      <ul className="divide-y divide-line/50">
        {snapshots.map((snapshot) => {
          const selected = selection.snapshotId === snapshot.id;
          const branchName = engine.getBranch(snapshot.branchId)?.name ?? snapshot.branchId;
          return (
            <li key={snapshot.id} className={`px-3 py-2.5 transition-colors ${selected ? 'bg-cyan/[0.07]' : 'hover:bg-white/[0.02]'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelection({ snapshotId: snapshot.id, branchId: snapshot.branchId })}
                  className="min-w-0 text-left"
                  aria-label={`Select snapshot ${snapshot.name}`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`truncate text-xs ${selected ? 'text-cyan' : 'text-chalk/90'}`}>{snapshot.name}</span>
                    <Badge tone={KIND_TONES[snapshot.kind]}>{snapshot.kind}</Badge>
                    {selected && <Badge tone="cyan">selected</Badge>}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <Tooltip label="Restore this recorded state into its reality">
                    <Button icon={<RotateCcw size={12} />} onClick={() => handleRestore(snapshot)}>Restore</Button>
                  </Tooltip>
                  <Tooltip label="Delete this local snapshot">
                    <Button variant="danger" icon={<Trash2 size={12} />} aria-label={`Delete snapshot ${snapshot.name}`} onClick={() => handleDelete(snapshot)} />
                  </Tooltip>
                </div>
              </div>
              <p className="mt-1 truncate text-[11px] text-muted">{snapshot.description ?? 'No description recorded.'}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] text-muted/80">
                <span>step {snapshot.step}</span>
                <span>t {snapshot.time.toFixed(1)}</span>
                <button
                  type="button"
                  onClick={() => selectBranch(snapshot.branchId)}
                  className="inline-flex items-center gap-1 text-cyan/80 hover:text-cyan hover:underline"
                  aria-label={`Select reality ${branchName}`}
                >
                  <GitBranch size={10} /> {branchName}
                </button>
                <span>{new Date(snapshot.createdAt).toLocaleString()}</span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const tabs: readonly TabItem<SnapshotFilter>[] = FILTERS.map((id) => ({
    id,
    label: id === 'all' ? 'All' : id,
    badge: id === 'all' ? allSnapshots.length : allSnapshots.filter((snapshot) => snapshot.kind === id).length,
    content: <div className="py-1">{renderList(visible)}</div>,
  }));

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Timeline checkpoints"
        title="Snapshots"
        description="Recorded world states from the active engine. Restores apply the stored state to the reality the snapshot came from; deletion only affects this browser session's engine."
        actions={<Button variant="solid" icon={<Camera size={13} />} onClick={() => openModal({ kind: 'snapshot' })}>Create snapshot</Button>}
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricCard label="Total snapshots" value={allSnapshots.length} />
        <MetricCard label="Manual" value={allSnapshots.filter((snapshot) => snapshot.kind === 'manual').length} />
        <MetricCard label="Automatic" value={allSnapshots.filter((snapshot) => snapshot.kind === 'auto').length} />
        <MetricCard label="Other" value={allSnapshots.filter((snapshot) => snapshot.kind === 'branch' || snapshot.kind === 'decision').length} />
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Recorded checkpoints" subtitle="Click a name to highlight it" className="min-h-[260px]" bodyClassName="p-0">
          <Tabs items={tabs} value={filter} onChange={setFilter} />
        </Panel>
        <Panel title="Snapshot detail" subtitle="Values read from the recorded state" bodyClassName="space-y-2 p-3">
          {!activeSnapshot ? (
            <EmptyState title="No snapshot selected" description="Capture or select a checkpoint to inspect its recorded variables." />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-chalk">{activeSnapshot.name}</span>
                <Badge tone={KIND_TONES[activeSnapshot.kind]}>{activeSnapshot.kind}</Badge>
              </div>
              <p className="text-[11px] leading-relaxed text-muted">{activeSnapshot.description ?? 'No description recorded.'}</p>
              <dl className="space-y-1 font-mono text-[10px]">
                <div className="flex justify-between gap-2"><dt className="text-muted">Step / time</dt><dd className="text-chalk/80">{activeSnapshot.step} / {activeSnapshot.time.toFixed(1)}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted">Reality</dt><dd className="truncate text-chalk/80">{engine.getBranch(activeSnapshot.branchId)?.name ?? activeSnapshot.branchId}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted">Created</dt><dd className="text-chalk/80">{new Date(activeSnapshot.createdAt).toLocaleString()}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted">ID</dt><dd className="truncate text-chalk/60">{activeSnapshot.id}</dd></div>
              </dl>
              <div className="border-t border-line/60 pt-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Recorded variables</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px]">
                  {engine.definitions.slice(0, 12).map((definition) => (
                    <div key={definition.id} className="flex justify-between gap-2">
                      <dt className="truncate text-muted">{definition.key}</dt>
                      <dd className="truncate text-chalk/80">{formatValue(activeSnapshot.state.variables[definition.id])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
