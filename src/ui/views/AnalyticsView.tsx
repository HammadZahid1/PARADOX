import { useMemo, useState } from 'react';
import { Activity, GitBranch } from 'lucide-react';
import { buildTrajectories, toNumericValue, trajectoryStatistics, type TrajectoryEntry } from '@/engine/analytics/trajectories';
import { aggregateWorkspaceMetrics, computeBranchSummary, computeRealityMetrics } from '@/engine/analytics/metrics';
import { eventFrequency, eventsByStep, severityBreakdown } from '@/engine/analytics/events';
import { useParadox } from '@/state/store';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { LineChart, type Series } from '@/ui/components/LineChart';
import { MetricCard } from '@/ui/components/MetricCard';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { Slider } from '@/ui/components/Slider';
import { Sparkline } from '@/ui/components/Sparkline';
import { Tabs, type TabItem } from '@/ui/components/Tabs';
import { formatValue } from '@/utils/format';

type AnalyticsTab = 'variables' | 'events' | 'realities';
type BadgeTone = 'neutral' | 'cyan' | 'violet' | 'amber' | 'danger' | 'success';

const PALETTE = ['#3ddbd9', '#a78bfa', '#e5a94c', '#4ade80', '#f87171', '#60a5fa'];
const SEVERITY_TONES: Record<string, BadgeTone> = {
  info: 'cyan',
  notice: 'neutral',
  warning: 'amber',
  critical: 'danger',
};

function severityTone(severity: string): BadgeTone {
  return SEVERITY_TONES[severity.toLowerCase()] ?? 'neutral';
}

export function AnalyticsView() {
  const engine = useParadox((state) => state.engine);
  const revision = useParadox((state) => state.revision);
  const selection = useParadox((state) => state.selection);
  const setSelection = useParadox((state) => state.setSelection);
  const [tab, setTab] = useState<AnalyticsTab>('variables');
  const [windowSize, setWindowSize] = useState(30);

  const branches = engine?.branchesList ?? [];
  const branch = (selection.branchId ? engine?.getBranch(selection.branchId) : undefined)
    ?? engine?.activeBranch
    ?? null;

  const trajectories = useMemo(() => {
    if (!engine || !branch) return [];
    return buildTrajectories(
      branch.timeline.entries,
      engine.definitions,
      (entry: TrajectoryEntry) => engine.getStateAt(branch.id, entry.step),
    );
  }, [engine, branch, revision]);

  const metrics = useMemo(() => (branch ? computeRealityMetrics(branch) : null), [branch, revision]);
  const workspace = useMemo(() => (engine ? aggregateWorkspaceMetrics(engine.branchesList) : null), [engine, revision]);

  const rows = useMemo(() => trajectories.map((trajectory, index) => {
    const definition = engine?.definitions[index];
    const samples = trajectory.points
      .map((point) => ({ step: point.step, value: toNumericValue(point.value) }))
      .filter((sample): sample is { step: number; value: number } => sample.value !== null);
    return { trajectory, definition, samples, statistics: trajectoryStatistics(trajectory) };
  }), [trajectories, engine]);

  const activeKey = useMemo(() => {
    const requested = selection.variableKey;
    if (requested && rows.some((row) => row.definition?.key === requested)) return requested;
    return rows.find((row) => row.samples.length > 0)?.definition?.key ?? rows[0]?.definition?.key ?? '';
  }, [rows, selection.variableKey]);

  const activeRow = rows.find((row) => row.definition?.key === activeKey) ?? rows[0];
  const series: Series[] = activeRow && activeRow.samples.length > 0
    ? [{
      key: activeRow.definition?.name ?? activeRow.trajectory.key,
      color: activeRow.definition?.color ?? PALETTE[0] ?? '#3ddbd9',
      points: activeRow.samples.slice(-120).map((sample) => ({ x: sample.step, y: sample.value })),
    }]
    : [];

  const events = branch ? (branch.timeline.events.length > 0 ? branch.timeline.events : branch.currentState.eventHistory) : [];
  const frequency = Object.entries(eventFrequency(events)).sort((a, b) => b[1] - a[1]);
  const severities = Object.entries(severityBreakdown(events)).sort((a, b) => b[1] - a[1]);
  const peakSteps = Object.entries(eventsByStep(events))
    .map(([step, stepEvents]) => ({ step: Number(step), count: stepEvents.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  if (!engine || !branch) {
    return <EmptyState title="No analytics" description="Load a scenario to compute trajectories, metrics and event statistics." />;
  }

  const variablesTab = (
    <div className="flex min-h-0 flex-col gap-3 p-3">
      <Panel
        title="Variable trajectory"
        subtitle={`${activeRow?.definition?.name ?? 'No variable'} · actual historical states`}
        actions={<Badge tone="cyan">{activeRow?.samples.length ?? 0} numeric samples</Badge>}
      >
        <LineChart series={series} height={200} label="Selected variable trajectory" />
      </Panel>
      <Panel
        title="Variable statistics"
        subtitle={`${rows.length} definitions · slope and volatility per step`}
        bodyClassName="p-0"
        actions={<div className="w-40"><Slider label="Sparkline window" value={windowSize} min={10} max={100} step={10} unit="samples" onChange={setWindowSize} /></div>}
      >
        <table className="w-full border-collapse font-mono text-[10px]">
          <thead className="sticky top-0 bg-carbon/95 text-muted">
            <tr className="border-b border-line/70 text-left">
              <th className="px-2 py-1.5 font-normal">Variable</th>
              <th className="px-2 py-1.5 font-normal">Current</th>
              <th className="px-2 py-1.5 font-normal">First → Last</th>
              <th className="px-2 py-1.5 font-normal">Range</th>
              <th className="px-2 py-1.5 font-normal">Slope</th>
              <th className="px-2 py-1.5 font-normal">Trend</th>
              <th className="px-2 py-1.5 font-normal">Volatility</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const key = row.definition?.key ?? row.trajectory.key;
              const selected = key === activeKey;
              return (
                <tr key={row.trajectory.variableId} className={`border-b border-line/40 ${selected ? 'bg-cyan/[0.06]' : ''}`}>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => setSelection({ variableKey: key })} className={`text-left hover:text-cyan ${selected ? 'text-cyan' : 'text-chalk/80'}`}>
                      {row.definition?.name ?? row.trajectory.key}
                    </button>
                    <span className="ml-1.5 text-muted/70">{key}</span>
                  </td>
                  <td className="px-2 py-1.5 text-chalk/80">{formatValue(branch.currentState.variables[row.trajectory.variableId] ?? row.definition?.initial)}</td>
                  <td className="px-2 py-1.5 text-muted">{formatValue(row.statistics.first)} → {formatValue(row.statistics.last)}</td>
                  <td className="px-2 py-1.5 text-muted">{formatValue(row.statistics.min)} / {formatValue(row.statistics.max)}</td>
                  <td className="px-2 py-1.5 text-muted">{row.statistics.slope.toFixed(3)}</td>
                  <td className="px-2 py-1.5">
                    <Sparkline
                      values={row.samples.slice(-windowSize).map((sample) => sample.value)}
                      color={row.definition?.color ?? PALETTE[index % PALETTE.length] ?? '#3ddbd9'}
                      width={96}
                      height={26}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-muted">{row.statistics.volatility.toFixed(3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );

  const eventsTab = (
    <div className="grid min-h-0 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Panel title="Event log" subtitle={`${events.length} records from ${branch.name}`} bodyClassName="p-0">
        {events.length === 0 ? (
          <EmptyState title="No events recorded" description="Events appear here once the rule engine fires one during simulation." />
        ) : (
          <table className="w-full border-collapse font-mono text-[10px]">
            <thead className="sticky top-0 bg-carbon/95 text-muted">
              <tr className="border-b border-line/70 text-left">
                <th className="px-2 py-1.5 font-normal">Step</th>
                <th className="px-2 py-1.5 font-normal">Event</th>
                <th className="px-2 py-1.5 font-normal">Severity</th>
                <th className="px-2 py-1.5 font-normal">Source</th>
              </tr>
            </thead>
            <tbody>
              {[...events].reverse().map((event) => (
                <tr key={event.id} className="border-b border-line/40">
                  <td className="px-2 py-1.5 text-muted">{event.step}</td>
                  <td className="px-2 py-1.5 text-chalk/80">{event.eventName}</td>
                  <td className="px-2 py-1.5"><Badge tone={severityTone(event.severity)}>{event.severity || 'unknown'}</Badge></td>
                  <td className="px-2 py-1.5 text-muted">{event.source || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <div className="flex min-h-0 flex-col gap-3">
        <Panel title="Severity breakdown" subtitle="From the authoritative event log">
          {severities.length === 0 ? <p className="font-mono text-[10px] text-muted">No severity data.</p> : (
            <div className="flex flex-wrap gap-2">
              {severities.map(([severity, count]) => <Badge key={severity} tone={severityTone(severity)}>{severity} · {count}</Badge>)}
            </div>
          )}
        </Panel>
        <Panel title="Event frequency" subtitle="Occurrences by event name">
          {frequency.length === 0 ? <p className="font-mono text-[10px] text-muted">No event frequency data.</p> : (
            <div className="space-y-1.5 font-mono text-[10px]">
              {frequency.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between gap-2 border-b border-line/40 pb-1">
                  <span className="truncate text-chalk/80">{name}</span>
                  <span className="text-cyan">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Peak steps" subtitle="Densest event clusters" className="flex-1">
          {peakSteps.length === 0 ? <p className="font-mono text-[10px] text-muted">No step clusters.</p> : (
            <div className="space-y-1.5 font-mono text-[10px]">
              {peakSteps.map(({ step, count }) => (
                <div key={step} className="flex items-center justify-between">
                  <span className="text-muted">step {step}</span>
                  <span className="text-amber">{count} events</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );

  const realitiesTab = (
    <div className="grid min-h-0 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Panel title="Reality index" subtitle="Metrics computed per branch" bodyClassName="p-0">
        <table className="w-full border-collapse font-mono text-[10px]">
          <thead className="sticky top-0 bg-carbon/95 text-muted">
            <tr className="border-b border-line/70 text-left">
              <th className="px-2 py-1.5 font-normal">Reality</th>
              <th className="px-2 py-1.5 font-normal">Steps</th>
              <th className="px-2 py-1.5 font-normal">Events</th>
              <th className="px-2 py-1.5 font-normal">Snapshots</th>
              <th className="px-2 py-1.5 font-normal">Decisions</th>
              <th className="px-2 py-1.5 font-normal">Diverged</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((item) => {
              const summary = computeBranchSummary(item);
              const selected = item.id === branch.id;
              return (
                <tr key={item.id} className={`border-b border-line/40 ${selected ? 'bg-cyan/[0.06]' : ''}`}>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => setSelection({ branchId: item.id })} className="flex items-center gap-2 hover:text-cyan">
                      <i className="h-2 w-2 shrink-0" style={{ background: item.color }} />
                      <span className={selected ? 'text-cyan' : 'text-chalk/80'}>{item.name}</span>
                      {item.id === engine.activeBranch.id && <Badge tone="cyan">active</Badge>}
                    </button>
                  </td>
                  <td className="px-2 py-1.5 text-muted">{summary.steps}</td>
                  <td className="px-2 py-1.5 text-muted">{summary.eventCount}</td>
                  <td className="px-2 py-1.5 text-muted">{summary.snapshotCount}</td>
                  <td className="px-2 py-1.5 text-muted">{summary.decisions}</td>
                  <td className="px-2 py-1.5 text-muted">{summary.divergenceStep}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <Panel title="Workspace totals" subtitle="Aggregated across all realities">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Realities" value={workspace?.branchCount ?? 0} />
          <MetricCard label="Steps" value={workspace?.stepCount ?? 0} />
          <MetricCard label="Events" value={workspace?.eventCount ?? 0} />
          <MetricCard label="Snapshots" value={workspace?.snapshotCount ?? 0} />
          <MetricCard label="Decisions" value={workspace?.decisionCount ?? 0} />
          <MetricCard label="Changes" value={workspace?.changeCount ?? 0} />
        </div>
      </Panel>
    </div>
  );

  const tabs: TabItem<AnalyticsTab>[] = [
    { id: 'variables', label: 'Variables', badge: rows.length, content: variablesTab },
    { id: 'events', label: 'Events', badge: events.length, content: eventsTab },
    { id: 'realities', label: 'Realities', badge: branches.length, content: realitiesTab },
  ];

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Analytics"
        title="Reality analytics"
        description="Trajectories, event statistics and per-reality metrics computed from recorded simulation states."
        actions={<>
          <select
            aria-label="Analytics reality"
            value={branch.id}
            onChange={(event) => setSelection({ branchId: event.target.value })}
            className="h-7 max-w-[220px] border border-line bg-graphite px-2 font-mono text-[11px] text-chalk"
          >
            {branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <Button icon={<GitBranch size={13} />} onClick={() => setSelection({ branchId: engine.activeBranch.id })}>Focus active</Button>
        </>}
      />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <MetricCard label="Steps" value={metrics?.stepCount ?? 0} />
        <MetricCard label="Events" value={metrics?.eventCount ?? 0} />
        <MetricCard label="Snapshots" value={metrics?.snapshotCount ?? 0} />
        <MetricCard label="Decisions" value={metrics?.decisionCount ?? 0} />
        <MetricCard label="Changes" value={metrics?.changeCount ?? 0} hint="largest recorded count" />
      </div>
      <div className="min-h-0 flex-1 border border-line/70 bg-carbon/40">
        <Tabs items={tabs} value={tab} onChange={setTab} />
      </div>
      <p className="flex items-center gap-2 font-mono text-[9px] text-muted/70"><Activity size={11} /> All statistics are derived locally; no synthetic samples are generated.</p>
    </div>
  );
}
