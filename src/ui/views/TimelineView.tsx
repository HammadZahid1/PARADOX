import { useMemo, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { useParadox } from '@/state/store';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { Slider } from '@/ui/components/Slider';

export function TimelineView() {
  const engine = useParadox((state) => state.engine);
  useParadox((state) => state.revision);
  const selection = useParadox((state) => state.selection);
  const setSelection = useParadox((state) => state.setSelection);
  const stepForward = useParadox((state) => state.stepForward);
  const [scrub, setScrub] = useState(0);
  const branches = engine?.branchesList ?? [];
  const maxStep = Math.max(1, ...branches.map((branch) => branch.timeline.entries.at(-1)?.step ?? 0));

  const layout = useMemo(() => {
    const x = scaleLinear().domain([0, Math.max(maxStep, scrub)]).range([60, 960]);
    const y = (index: number): number => 56 + index * 72;
    return { x, y };
  }, [maxStep, scrub]);

  if (!engine) return <EmptyState title="No timeline" description="Load a scenario to generate simulation history." />;

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Branching timeline"
        title="Timeline explorer"
        description="Every marker is derived from recorded simulation steps, events and divergence points."
        actions={<Button onClick={stepForward}>Step forward</Button>}
      />
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Panel title="Timeline graph" subtitle={`${branches.length} realities · ${maxStep} steps`}>
          <svg viewBox="0 0 1000 100 + branches.length * 72" width="100%" role="img" aria-label="Branching simulation timeline">
            <defs>
              <pattern id="timeline-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a2029" strokeWidth="0.5" /></pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#timeline-grid)" />
            {branches.map((branch, index) => {
              const points = branch.timeline.entries.map((entry) => `${layout.x(entry.step)},${layout.y(index)}`).join(' ');
              return (
                <g key={branch.id} onClick={() => setSelection({ branchId: branch.id })} className="cursor-pointer">
                  <polyline points={points} fill="none" stroke={branch.color} strokeWidth={selection.branchId === branch.id ? 2.5 : 1.2} opacity={selection.branchId === branch.id ? 1 : 0.55} />
                  {branch.timeline.entries.map((entry) => (
                    <g key={`${branch.id}-${entry.step}`}>
                      <circle cx={layout.x(entry.step)} cy={layout.y(index)} r={entry.checkpoint ? 5 : 2.5} fill={branch.color} />
                      {entry.eventIds.length > 0 && <rect x={layout.x(entry.step) - 2} y={layout.y(index) - 12} width={4} height={4} fill="#e5a94c" />}
                    </g>
                  ))}
                  {branch.parentId && <circle cx={layout.x(branch.branchPointStep)} cy={layout.y(index)} r={7} fill="none" stroke={branch.color} strokeWidth={1} />}
                  <text x={12} y={layout.y(index) - 8} fill={branch.color} fontSize={10} fontFamily="monospace">{branch.name.slice(0, 22)}</text>
                </g>
              );
            })}
            {Array.from({ length: Math.ceil(maxStep / 10) + 1 }, (_, index) => index * 10).map((tick) => (
              <text key={tick} x={layout.x(tick)} y={18} fill="#7d8896" fontSize={9} fontFamily="monospace" textAnchor="middle">{tick}</text>
            ))}
          </svg>
        </Panel>
        <div className="flex min-h-0 flex-col gap-3">
          <Panel title="Scrubber"><Slider label="Replay position" value={scrub} min={0} max={maxStep} onChange={setScrub} unit="step" /></Panel>
          <Panel title="Selected reality" className="flex-1">
            {(() => {
              const branch = engine.getBranch(selection.branchId ?? '') ?? engine.activeBranch;
              return (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between"><span className="text-muted">Name</span><span className="text-cyan">{branch.name}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted">Steps</span><span>{branch.timeline.entries.length}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted">Events</span><span>{branch.timeline.events.length}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted">Snapshots</span><span>{branch.timeline.snapshots.length}</span></div>
                  {branch.divergenceEventId && <Badge tone="violet">Diverged at event</Badge>}
                  <p className="border-t border-line/60 pt-3 text-[11px] leading-relaxed text-muted">{branch.description ?? 'No description recorded for this reality.'}</p>
                </div>
              );
            })()}
          </Panel>
        </div>
      </div>
    </div>
  );
}
