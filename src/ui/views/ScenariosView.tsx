import { Binary, Plus } from 'lucide-react';
import { useParadox } from '@/state/store';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { MetricCard } from '@/ui/components/MetricCard';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/30 py-1 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate text-chalk/80">{value}</dd>
    </div>
  );
}

export function ScenariosView() {
  const scenarios = useParadox((state) => state.scenarios);
  const workspace = useParadox((state) => state.workspace);
  const loadScenario = useParadox((state) => state.loadScenario);
  const openModal = useParadox((state) => state.openModal);

  const newScenario = (
    <Button icon={<Plus size={13} />} variant="solid" onClick={() => openModal({ kind: 'newScenario' })}>
      New scenario
    </Button>
  );

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Scenario library"
        title="Scenarios"
        description="Inspect the preset definitions and load one into the simulation engine. All metadata is read from the registered scenarios."
        actions={newScenario}
      />
      {scenarios.length === 0 ? (
        <EmptyState
          title="No scenarios registered"
          description="No scenario data is available yet. Create one locally to populate the library."
          action={newScenario}
        />
      ) : (
        <div className="grid min-h-0 flex-1 content-start gap-3 overflow-auto xl:grid-cols-2">
          {scenarios.map((scenario) => {
            const active = workspace.activeScenarioId === scenario.id;
            const config = scenario.configuration;
            return (
              <Panel
                key={scenario.id}
                title={scenario.name}
                subtitle={`${scenario.domain} · ${scenario.id}`}
                actions={
                  <>
                    <Badge tone={scenario.preset ? 'violet' : 'neutral'}>{scenario.preset ? 'Preset' : 'Custom'}</Badge>
                    {active && <Badge tone="success">Active</Badge>}
                    <Button
                      variant={active ? 'ghost' : 'solid'}
                      onClick={() => loadScenario(scenario.id)}
                      disabled={active}
                      icon={<Binary size={13} />}
                    >
                      {active ? 'Loaded' : 'Load'}
                    </Button>
                  </>
                }
                className="h-fit"
              >
                <div className="space-y-3 p-3 text-xs">
                  <p className="leading-relaxed text-muted">{scenario.description}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <MetricCard label="Variables" value={scenario.variables.length} />
                    <MetricCard label="Events" value={scenario.events.length} />
                    <MetricCard label="Rules" value={scenario.rules.length} />
                  </div>
                  <dl className="font-mono text-[10px]">
                    <MetadataRow label="Seed" value={String(config.seed)} />
                    <MetadataRow label="Mode" value={config.mode} />
                    <MetadataRow label="Propagation limit" value={String(config.propagationLimit)} />
                    <MetadataRow label="Max steps" value={String(config.maxSteps)} />
                    <MetadataRow label="Step duration" value={String(config.stepDuration)} />
                  </dl>
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-line/50 pt-2">
                    {scenario.tags.length === 0 ? (
                      <span className="font-mono text-[10px] text-muted">No tags</span>
                    ) : (
                      scenario.tags.map((tag) => (
                        <Badge key={tag} tone={tag === 'preset' ? 'cyan' : 'neutral'}>{tag}</Badge>
                      ))
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
