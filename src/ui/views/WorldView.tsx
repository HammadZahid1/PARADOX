import { useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { VariableDefinition } from '@/engine/types';
import { useParadox } from '@/state/store';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { MetricCard } from '@/ui/components/MetricCard';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { Slider } from '@/ui/components/Slider';
import { Tooltip } from '@/ui/components/Tooltip';
import { formatValue } from '@/utils/format';

function groupOf(definition: VariableDefinition): string {
  if ('group' in definition && typeof definition.group === 'string' && definition.group.trim() !== '') return definition.group;
  if ('category' in definition && typeof definition.category === 'string' && definition.category.trim() !== '') return definition.category;
  if (definition.type === 'derived') return 'Derived';
  return 'Variables';
}

function isDerived(definition: VariableDefinition): boolean {
  return definition.type === 'derived' || definition.expression !== undefined || (definition.derivedFrom?.length ?? 0) > 0;
}

export function WorldView() {
  const engine = useParadox((state) => state.engine);
  useParadox((state) => state.revision);
  const adjustVariable = useParadox((state) => state.adjustVariable);
  const setSelection = useParadox((state) => state.setSelection);

  const definitions = engine?.definitions ?? [];
  const branch = engine?.activeBranch;
  const state = branch?.currentState;

  const groups = useMemo(() => {
    const result = new Map<string, VariableDefinition[]>();
    for (const definition of definitions) {
      const key = groupOf(definition);
      const bucket = result.get(key);
      if (bucket) bucket.push(definition);
      else result.set(key, [definition]);
    }
    return [...result.entries()].map(([name, items]) => ({ name, items }));
  }, [definitions]);

  const definitionById = useMemo(() => new Map(definitions.map((definition) => [definition.id, definition])), [definitions]);

  if (!engine || !branch || !state) {
    return <EmptyState title="No world state" description="Load a scenario to inspect and adjust its live variables." />;
  }

  const activeEvents = state.activeEvents;
  const changes = state.changes;

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="World editor"
        title={`${engine.scenario.name} · ${branch.name}`}
        description="Adjust live numeric values through the engine. Each change is validated, constrained and recorded by the simulation."
        actions={
          <Button
            icon={<SlidersHorizontal size={13} />}
            onClick={() => setSelection({ branchId: branch.id })}
          >
            Focus active reality
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <MetricCard label="Step" value={state.step} hint={`of ${engine.scenario.configuration.maxSteps}`} />
        <MetricCard label="World time" value={state.time.toFixed(1)} unit="t" />
        <MetricCard label="Active events" value={activeEvents.length} />
        <MetricCard label="Changes" value={changes.length} hint="in current state" />
        <MetricCard label="Event history" value={state.eventHistory.length} />
      </div>
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel title="Variables" subtitle={`${definitions.length} definitions · ${groups.length} groups`} bodyClassName="p-0">
          <div className="space-y-3 p-3">
            {groups.map((group) => (
              <div key={group.name}>
                <div className="mb-2 flex items-center gap-2 border-b border-line/50 pb-1">
                  <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{group.name}</h2>
                  <span className="font-mono text-[9px] text-muted">{group.items.length}</span>
                </div>
                <div className="space-y-2">
                  {group.items.map((definition) => {
                    const current = state.variables[definition.id] ?? definition.initial;
                    const min = definition.min ?? definition.constraints?.min ?? 0;
                    const max = definition.max ?? definition.constraints?.max ?? 100;
                    const step = definition.constraints?.step ?? 1;
                    const derived = isDerived(definition);
                    const editable = typeof current === 'number';
                    const derivedDetail = definition.expression ?? (definition.derivedFrom?.join(', ') ?? 'Derived from simulation rules');
                    return (
                      <div key={definition.id} className="border border-line/50 bg-void/30 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-chalk/90">{definition.name}</span>
                              <span className="font-mono text-[9px] text-muted">{definition.key}</span>
                              {derived && (
                                <Tooltip label={derivedDetail}>
                                  <Badge tone="violet">Derived</Badge>
                                </Tooltip>
                              )}
                              {definition.constraints?.integer && <Badge tone="neutral">Integer</Badge>}
                            </div>
                            {definition.description && <p className="mt-1 text-[10px] leading-relaxed text-muted">{definition.description}</p>}
                          </div>
                          <div className="shrink-0 text-right font-mono text-[10px]">
                            <div className="text-cyan">now {formatValue(current, definition.unit)}</div>
                            <div className="text-muted">initial {formatValue(definition.initial, definition.unit)}</div>
                          </div>
                        </div>
                        {editable ? (
                          <div className="mt-3 flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <Slider
                                label={definition.name}
                                value={current}
                                min={min}
                                max={max}
                                step={step}
                                unit={definition.unit}
                                onChange={(value) => adjustVariable(definition.key, value)}
                              />
                            </div>
                            <span className="shrink-0 font-mono text-[9px] text-muted">[{min}, {max}] / {step}</span>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[10px] text-muted">
                            <span>{definition.type} value</span>
                            <span>{formatValue(current, definition.unit)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <div className="flex min-h-0 flex-col gap-3">
          <Panel title="World metrics" subtitle="Computed by the engine" className="shrink-0">
            {Object.entries(state.metrics).length === 0 ? (
              <p className="p-3 font-mono text-[10px] text-muted">No metrics recorded.</p>
            ) : (
              <dl className="space-y-1.5 p-3 font-mono text-[10px]">
                {Object.entries(state.metrics).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <dt className="truncate text-muted">{key}</dt>
                    <dd className="text-chalk/80">{formatValue(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>
          <Panel title="Active events" subtitle={`${activeEvents.length} in effect`} className="min-h-[120px]">
            {activeEvents.length === 0 ? (
              <p className="p-3 font-mono text-[10px] text-muted">No active events.</p>
            ) : (
              <ul className="space-y-2 p-3">
                {activeEvents.map((instance) => (
                  <li key={instance.instanceId} className="border border-line/40 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] text-chalk/90">{instance.name}</span>
                      <Badge tone={instance.severity === 'critical' ? 'danger' : instance.severity === 'warning' ? 'amber' : 'cyan'}>{instance.severity}</Badge>
                    </div>
                    <p className="mt-1 font-mono text-[9px] text-muted">
                      step {instance.startedStep} · {instance.source}
                      {instance.remainingSteps !== undefined ? ` · ${instance.remainingSteps} left` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Latest changes" subtitle="Current state diff" className="min-h-[140px] flex-1">
            {changes.length === 0 ? (
              <p className="p-3 font-mono text-[10px] text-muted">No changes recorded.</p>
            ) : (
              <ul className="space-y-1.5 p-3 font-mono text-[10px]">
                {changes.slice(-12).reverse().map((change, index) => (
                  <li key={`${change.variableId}-${change.step}-${index}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-line/30 pb-1 last:border-0">
                    <span className="text-chalk/80">{definitionById.get(change.variableId)?.key ?? change.variableId}</span>
                    <span className="text-cyan">{formatValue(change.from)} → {formatValue(change.to)}</span>
                    <span className="text-muted">step {change.step} · {change.source}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
