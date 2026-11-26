import { useMemo, useState } from 'react';
import { Clock3, GitBranch, History as HistoryIcon } from 'lucide-react';
import type { HistoryKind, WorldState } from '@/engine/types';
import { filterHistory, historySummary } from '@/engine/timeline/history';
import { buildReplayFrames } from '@/engine/timeline/replay';
import { useParadox } from '@/state/store';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { MetricCard } from '@/ui/components/MetricCard';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { Tooltip } from '@/ui/components/Tooltip';

type Tone = 'neutral' | 'cyan' | 'violet' | 'amber' | 'danger' | 'success';

const KINDS: readonly HistoryKind[] = [
  'world', 'variable', 'event', 'step', 'branch', 'scenario', 'snapshot', 'restoration', 'decision',
];

const KIND_TONES: Record<HistoryKind, Tone> = {
  world: 'cyan',
  variable: 'violet',
  event: 'amber',
  step: 'neutral',
  branch: 'violet',
  scenario: 'cyan',
  snapshot: 'success',
  restoration: 'amber',
  decision: 'cyan',
};

export function HistoryView() {
  const engine = useParadox((state) => state.engine);
  const revision = useParadox((state) => state.revision);
  const selection = useParadox((state) => state.selection);
  const setSelection = useParadox((state) => state.setSelection);
  const selectBranch = useParadox((state) => state.selectBranch);
  const [kind, setKind] = useState<'all' | HistoryKind>('all');
  const [branchId, setBranchId] = useState('all');
  const [query, setQuery] = useState('');

  const branches = engine?.branchesList ?? [];
  const branchFilter = branches.some((branch) => branch.id === branchId) ? branchId : 'all';
  const summary = useMemo(() => historySummary(engine?.historyList ?? []), [engine, revision]);
  const entries = useMemo(() => filterHistory(engine?.historyList ?? [], {
    kind: kind === 'all' ? undefined : kind,
    branchId: branchFilter === 'all' ? undefined : branchFilter,
    query: query.trim() || undefined,
  }).slice().sort((a, b) => a.timestamp - b.timestamp || a.step - b.step), [engine, revision, kind, branchFilter, query]);

  const frames = useMemo(() => {
    if (!engine) return [];
    const branch = engine.getBranch(selection.branchId ?? '') ?? engine.activeBranch;
    const states = branch.timeline.entries
      .map((entry) => engine.getStateAt(branch.id, entry.step))
      .filter((state): state is WorldState => state !== undefined);
    return buildReplayFrames(branch.timeline, states).slice(-6).reverse();
  }, [engine, revision, selection.branchId]);

  if (!engine) {
    return <EmptyState title="No history yet" description="Load a scenario and run the simulation to record real history and replay frames." />;
  }

  const branchName = (id: string): string => engine.getBranch(id)?.name ?? id;
  const selectedBranch = engine.getBranch(selection.branchId ?? '') ?? engine.activeBranch;
  const totalRecords = Object.values(summary).reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Audit trail"
        title="Simulation history"
        description="A chronological record of real engine activity. Filter by category or reality, then select a branch to inspect its replay frames."
        actions={<>
          <Badge tone="cyan">{entries.length} of {totalRecords} entries</Badge>
          <Button icon={<HistoryIcon size={13} />} onClick={() => { setKind('all'); setBranchId('all'); setQuery(''); }}>Reset filters</Button>
        </>}
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricCard label="Recorded entries" value={totalRecords} />
        <MetricCard label="Events fired" value={summary.event} />
        <MetricCard label="Snapshots & restores" value={summary.snapshot + summary.restoration} />
        <MetricCard label="Realities" value={branches.length} hint="in this engine" />
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-h-0 flex-col gap-3">
          <Panel title="Filters" subtitle="Engine-recorded categories and branches" bodyClassName="grid gap-3 p-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Category</span>
              <select
                aria-label="Filter history by category"
                value={kind}
                onChange={(event) => {
                  const value = event.target.value;
                  setKind(value === 'all' ? 'all' : KINDS.find((item) => item === value) ?? 'all');
                }}
                className="h-8 w-full border border-line bg-void px-2 font-mono text-[11px] text-chalk outline-none focus:border-cyan/60"
              >
                <option value="all">All categories</option>
                {KINDS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Reality</span>
              <select
                aria-label="Filter history by branch"
                value={branchFilter}
                onChange={(event) => setBranchId(event.target.value)}
                className="h-8 w-full border border-line bg-void px-2 font-mono text-[11px] text-chalk outline-none focus:border-cyan/60"
              >
                <option value="all">All realities</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Search</span>
              <input
                aria-label="Search history entries"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="summary or detail"
                className="h-8 w-full border border-line bg-void px-2 font-mono text-[11px] text-chalk outline-none placeholder:text-muted/60 focus:border-cyan/60"
              />
            </label>
          </Panel>

          <Panel title="Recorded entries" subtitle={`${entries.length} matching history records`} className="min-h-[240px] flex-1" bodyClassName="p-0">
            {entries.length === 0 ? (
              <EmptyState title="No matching records" description="Adjust the category, reality or search filter to see recorded engine history." />
            ) : (
              <ol className="divide-y divide-line/50">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.02]">
                    <div className="w-16 shrink-0 border-r border-line/50 pr-2 font-mono text-[10px] leading-relaxed text-muted">
                      <div className="text-cyan/80">step {entry.step}</div>
                      <div>t {entry.time.toFixed(1)}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={KIND_TONES[entry.kind]}>{entry.kind}</Badge>
                        <span className="truncate text-xs text-chalk/90">{entry.summary}</span>
                      </div>
                      {entry.detail && <p className="mt-1 text-[11px] leading-relaxed text-muted">{entry.detail}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[9px] text-muted/70">
                        <Clock3 size={10} />
                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => selectBranch(entry.branchId)}
                          className="inline-flex items-center gap-1 text-cyan/80 hover:text-cyan hover:underline"
                          aria-label={`Select reality ${branchName(entry.branchId)}`}
                        >
                          <GitBranch size={10} /> {branchName(entry.branchId)}
                        </button>
                      </div>
                    </div>
                    {entry.severity && entry.severity !== 'info' && (
                      <Tooltip label={`Recorded severity: ${entry.severity}`}>
                        <Badge tone="neutral">{entry.severity}</Badge>
                      </Tooltip>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <Panel title="Replay frames" subtitle={`Most recent frames from ${selectedBranch.name}`} className="min-h-[220px] flex-1" bodyClassName="p-0">
            {frames.length === 0 ? (
              <EmptyState title="No replay frames" description="Step the simulation to append recorded timeline frames for the selected reality." />
            ) : (
              <ol className="divide-y divide-line/50">
                {frames.map((frame) => {
                  const eventNames = frame.eventIds.map((id) => engine.scenario.events.find((event) => event.id === id)?.name ?? id);
                  const variables = frame.changedVariables.map((id) => engine.definitions.find((definition) => definition.id === id)?.key ?? id);
                  return (
                    <li key={`${selectedBranch.id}-${frame.step}`} className="px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-cyan">step {frame.step} · t {frame.time.toFixed(1)}</span>
                        {frame.checkpoint && <Badge tone="amber">checkpoint</Badge>}
                      </div>
                      {eventNames.length > 0 && <p className="mt-1 truncate text-[11px] text-chalk/80">{eventNames.join(' · ')}</p>}
                      {variables.length > 0 && <p className="mt-0.5 truncate font-mono text-[9px] text-muted">Δ {variables.join(', ')}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
          <Panel title="Inspected reality" subtitle="Selection shared across views" bodyClassName="space-y-2 p-3">
            <div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted">Active</span><span className="truncate text-cyan">{engine.activeBranch.name}</span></div>
            <div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted">Inspected</span><span className="truncate text-chalk/80">{selectedBranch.name}</span></div>
            <div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted">Recorded steps</span><span className="font-mono text-chalk/80">{selectedBranch.timeline.entries.length}</span></div>
            <div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted">Recorded events</span><span className="font-mono text-chalk/80">{selectedBranch.timeline.events.length}</span></div>
            <Button className="w-full" onClick={() => setSelection({ branchId: engine.activeBranch.id })}>Inspect active reality</Button>
          </Panel>
        </div>
      </div>
    </div>
  );
}
