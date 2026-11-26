import { useMemo, useState } from 'react';
import { ArrowRightLeft, GitCompare } from 'lucide-react';
import type { VariableTrajectory } from '@/engine/types';
import { compareBranches } from '@/engine/comparison/compare';
import { toNumericValue } from '@/engine/analytics/trajectories';
import { useParadox } from '@/state/store';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { LineChart, type Series } from '@/ui/components/LineChart';
import { MetricCard } from '@/ui/components/MetricCard';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { Sparkline } from '@/ui/components/Sparkline';
import { Tabs, type TabItem } from '@/ui/components/Tabs';
import { formatValue } from '@/utils/format';

type CompareTab = 'trajectories' | 'differences' | 'events';

function numericSeries(trajectory: VariableTrajectory | undefined, key: string, color: string): Series {
  return {
    key,
    color,
    points: (trajectory?.points ?? [])
      .map((point) => ({ x: point.step, y: toNumericValue(point.value) }))
      .filter((point): point is { x: number; y: number } => point.y !== null),
  };
}

export function CompareView() {
  const engine = useParadox((state) => state.engine);
  const revision = useParadox((state) => state.revision);
  const setSelection = useParadox((state) => state.setSelection);
  const openModal = useParadox((state) => state.openModal);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [variableKey, setVariableKey] = useState('');
  const [tab, setTab] = useState<CompareTab>('trajectories');

  const branches = engine?.branchesList ?? [];
  const left = branches.find((branch) => branch.id === leftId) ?? branches[0] ?? null;
  const right = branches.find((branch) => branch.id === rightId && branch.id !== left?.id)
    ?? branches.find((branch) => branch.id !== left?.id)
    ?? null;

  const comparison = useMemo(
    () => (engine && left && right ? compareBranches(left, right, engine.definitions) : null),
    [engine, left, right, revision],
  );

  const definitionCount = engine?.definitions.length ?? 0;
  const activeKey = comparison && variableKey && comparison.differences.some((difference) => difference.key === variableKey)
    ? variableKey
    : comparison?.differences[0]?.key ?? '';
  const activeIndex = engine?.definitions.findIndex((definition) => definition.key === activeKey) ?? -1;
  const leftTrajectory = comparison && activeIndex >= 0 ? comparison.trajectories[activeIndex] : undefined;
  const rightTrajectory = comparison && activeIndex >= 0 ? comparison.trajectories[activeIndex + definitionCount] : undefined;

  const series: Series[] = comparison && left && right
    ? [
      numericSeries(leftTrajectory, left.name, left.color),
      numericSeries(rightTrajectory, right.name, right.color),
    ]
    : [];

  const differences = comparison?.differences.filter((difference) => difference.absolute !== null || difference.left !== difference.right) ?? [];
  const changedCount = differences.length;

  if (!engine || !left || !right || !comparison) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <SectionHeader eyebrow="Comparison" title="Reality comparison" description="Compare variable histories and event signatures between two realities." />
        <EmptyState
          title={engine ? 'Need two realities' : 'No active scenario'}
          description={engine ? 'Create a branch from the current state, then compare it against the prime reality.' : 'Load a scenario to populate the reality index.'}
          action={engine ? <Button onClick={() => openModal({ kind: 'newBranch' })}>Create reality</Button> : undefined}
        />
      </div>
    );
  }

  const trajectoriesTab = (
    <div className="flex min-h-0 flex-col gap-3 p-3">
      <Panel
        title="Comparative trajectory"
        subtitle={`${activeKey || 'no variable'} · left vs right across shared steps`}
        actions={<Badge tone="violet">divergence {comparison.divergenceStep ?? '—'}</Badge>}
      >
        <LineChart series={series} height={230} label="Comparative variable trajectory" />
      </Panel>
      <Panel title="Select variable" subtitle="Definitions come from the active scenario">
        <div className="flex flex-wrap gap-1.5">
          {engine.definitions.map((definition) => (
            <Button
              key={definition.id}
              active={definition.key === activeKey}
              onClick={() => setVariableKey(definition.key)}
            >
              {definition.name}
            </Button>
          ))}
        </div>
      </Panel>
    </div>
  );

  const differencesTab = (
    <div className="min-h-0 p-3">
      <Panel title="Variable differences" subtitle={`${changedCount} values differ at the current step`} bodyClassName="p-0">
        <table className="w-full border-collapse font-mono text-[10px]">
          <thead className="sticky top-0 bg-carbon/95 text-muted">
            <tr className="border-b border-line/70 text-left">
              <th className="px-2 py-1.5 font-normal">Variable</th>
              <th className="px-2 py-1.5 font-normal">{left.name}</th>
              <th className="px-2 py-1.5 font-normal">{right.name}</th>
              <th className="px-2 py-1.5 font-normal">Absolute</th>
              <th className="px-2 py-1.5 font-normal">Relative</th>
              <th className="px-2 py-1.5 font-normal">Diverged at</th>
              <th className="px-2 py-1.5 font-normal">Right trend</th>
            </tr>
          </thead>
          <tbody>
            {comparison.differences.map((difference) => {
              const diverged = difference.divergedAtStep !== undefined || difference.left !== difference.right;
              const trajectoryIndex = engine.definitions.findIndex((definition) => definition.key === difference.key);
              const trajectory = trajectoryIndex >= 0 ? comparison.trajectories[trajectoryIndex + definitionCount] : undefined;
              return (
                <tr key={difference.key} className={`border-b border-line/40 ${diverged ? 'bg-violet/[0.04]' : ''}`}>
                  <td className="px-2 py-1.5 text-chalk/80">{difference.key}</td>
                  <td className="px-2 py-1.5 text-muted">{formatValue(difference.left)}</td>
                  <td className="px-2 py-1.5 text-muted">{formatValue(difference.right)}</td>
                  <td className="px-2 py-1.5 text-cyan">{formatValue(difference.absolute)}</td>
                  <td className="px-2 py-1.5 text-muted">{formatValue(difference.relative)}</td>
                  <td className="px-2 py-1.5">
                    {difference.divergedAtStep !== undefined ? <Badge tone="amber">step {difference.divergedAtStep}</Badge> : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    <Sparkline
                      values={numericSeries(trajectory, difference.key, right.color).points.slice(-30).map((point) => point.y)}
                      color={right.color}
                      width={90}
                      height={24}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );

  const eventsTab = (
    <div className="grid min-h-0 gap-3 p-3 lg:grid-cols-3">
      <Panel title="Common events" subtitle={`${comparison.commonEvents.length} shared event signatures`}>
        {comparison.commonEvents.length === 0 ? <p className="font-mono text-[10px] text-muted">No shared events.</p> : (
          <div className="flex flex-wrap gap-1.5">
            {comparison.commonEvents.map((name) => <Badge key={name} tone="cyan">{name}</Badge>)}
          </div>
        )}
      </Panel>
      <Panel title={`Unique to ${left.name}`} subtitle={`${comparison.uniqueLeftEvents.length} event signatures`}>
        {comparison.uniqueLeftEvents.length === 0 ? <p className="font-mono text-[10px] text-muted">No unique events.</p> : (
          <div className="flex flex-wrap gap-1.5">
            {comparison.uniqueLeftEvents.map((name) => <Badge key={name} tone="violet">{name}</Badge>)}
          </div>
        )}
      </Panel>
      <Panel title={`Unique to ${right.name}`} subtitle={`${comparison.uniqueRightEvents.length} event signatures`}>
        {comparison.uniqueRightEvents.length === 0 ? <p className="font-mono text-[10px] text-muted">No unique events.</p> : (
          <div className="flex flex-wrap gap-1.5">
            {comparison.uniqueRightEvents.map((name) => <Badge key={name} tone="amber">{name}</Badge>)}
          </div>
        )}
      </Panel>
    </div>
  );

  const tabs: TabItem<CompareTab>[] = [
    { id: 'trajectories', label: 'Trajectories', content: trajectoriesTab },
    { id: 'differences', label: 'Differences', badge: changedCount, content: differencesTab },
    { id: 'events', label: 'Events', badge: comparison.commonEvents.length, content: eventsTab },
  ];

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Comparison"
        title="Reality comparison"
        description="Divergence, variable deltas and comparative histories derived from the two selected realities."
        actions={<>
          <select
            aria-label="Left reality"
            value={left.id}
            onChange={(event) => setLeftId(event.target.value)}
            className="h-7 max-w-[180px] border border-line bg-graphite px-2 font-mono text-[11px] text-chalk"
          >
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <Button
            icon={<ArrowRightLeft size={13} />}
            onClick={() => { setLeftId(right.id); setRightId(left.id); }}
          >
            Swap
          </Button>
          <select
            aria-label="Right reality"
            value={right.id}
            onChange={(event) => setRightId(event.target.value)}
            className="h-7 max-w-[180px] border border-line bg-graphite px-2 font-mono text-[11px] text-chalk"
          >
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <Button icon={<GitCompare size={13} />} onClick={() => setSelection({ branchId: right.id })}>Focus right</Button>
        </>}
      />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <MetricCard label="Divergence step" value={comparison.divergenceStep ?? '—'} />
        <MetricCard label="Changed variables" value={changedCount} />
        <MetricCard label="Left events" value={comparison.leftEventCount} />
        <MetricCard label="Right events" value={comparison.rightEventCount} />
        <MetricCard label="Common events" value={comparison.commonEvents.length} />
      </div>
      <div className="min-h-0 flex-1 border border-line/70 bg-carbon/40">
        <Tabs items={tabs} value={tab} onChange={setTab} />
      </div>
    </div>
  );
}
