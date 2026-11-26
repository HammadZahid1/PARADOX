import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { EventEffect, EventTrigger } from '@/engine/types';
import { useParadox } from '@/state/store';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { MetricCard } from '@/ui/components/MetricCard';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { Tabs, type TabItem } from '@/ui/components/Tabs';
import { formatValue } from '@/utils/format';

type Tone = 'neutral' | 'cyan' | 'violet' | 'amber' | 'danger' | 'success';
type EventTab = 'catalog' | 'fired';

function severityTone(severity: string): Tone {
  if (severity === 'critical') return 'danger';
  if (severity === 'warning') return 'amber';
  if (severity === 'notice') return 'violet';
  if (severity === 'info') return 'cyan';
  return 'neutral';
}

function describeTrigger(trigger: EventTrigger): string {
  switch (trigger.kind) {
    case 'manual': return 'Manual injection';
    case 'scheduled': return `Scheduled at step ${trigger.atStep}${trigger.atTime !== undefined ? ` · t=${trigger.atTime}` : ''}`;
    case 'threshold': return `${trigger.variableKey} ${trigger.operator} ${formatValue(trigger.value)}`;
    case 'boolean': return `${trigger.variableKey} is ${trigger.expected ? 'true' : 'false'}`;
    case 'probability': return `${(trigger.threshold * 100).toFixed(1)}% chance${trigger.perStep ? ' per step' : ''}`;
    case 'dependency': return `After ${trigger.eventIds.join(', ')}${trigger.requireAll ? ' (all required)' : ''}`;
    case 'recurring': return `Every ${trigger.intervalSteps} steps${trigger.startStep !== undefined ? ` from step ${trigger.startStep}` : ''}${trigger.maxOccurrences !== undefined ? ` · max ${trigger.maxOccurrences}` : ''}`;
    case 'cascade': return `Cascade from ${trigger.parentEventId}${trigger.delaySteps !== undefined ? ` after ${trigger.delaySteps} steps` : ''}`;
  }
}

function describeEffect(effect: EventEffect): string {
  switch (effect.kind) {
    case 'increase': return `${effect.variableKey} += ${effect.amount}`;
    case 'decrease': return `${effect.variableKey} -= ${effect.amount}`;
    case 'assign': return `${effect.variableKey} = ${formatValue(effect.value)}`;
    case 'multiply': return `${effect.variableKey} × ${effect.factor}`;
    case 'percentChange': return `${effect.variableKey} ${effect.percent >= 0 ? '+' : ''}${effect.percent}%`;
    case 'temporary': return `${effect.variableKey} ${effect.delta >= 0 ? '+' : ''}${effect.delta} for ${effect.durationSteps} steps`;
    case 'activate': return `Activate ${effect.eventId}`;
    case 'cancel': return `Cancel ${effect.eventId}`;
    case 'log': return `Log: ${effect.message}`;
    case 'conditional': return `If ${effect.condition.variableKey} ${effect.condition.operator} ${formatValue(effect.condition.value)} → ${describeEffect(effect.then)}${effect.otherwise ? ` · else ${describeEffect(effect.otherwise)}` : ''}`;
  }
}

export function EventsView() {
  const engine = useParadox((state) => state.engine);
  useParadox((state) => state.revision);
  const openModal = useParadox((state) => state.openModal);
  const setSelection = useParadox((state) => state.setSelection);
  const [tab, setTab] = useState<EventTab>('catalog');

  if (!engine) {
    return <EmptyState title="No event data" description="Load a scenario to inspect its event definitions and firing history." />;
  }

  const branch = engine.activeBranch;
  const state = branch.currentState;
  const fired = branch.timeline.events;
  const history = state.eventHistory;

  const catalog = (
    <div className="space-y-2 p-3">
      {engine.scenario.events.length === 0 ? (
        <EmptyState title="No events defined" description="This scenario has no event definitions to inject." />
      ) : engine.scenario.events.map((event) => {
        const records = fired.filter((record) => record.eventId === event.id);
        const last = records.at(-1);
        const active = state.activeEvents.some((instance) => instance.eventId === event.id);
        const outcomeCount = event.outcomes?.length ?? 0;
        return (
          <div key={event.id} className="border border-line/60 bg-void/30 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-chalk/90">{event.name}</span>
                  <Badge tone={severityTone(event.severity)}>{event.severity}</Badge>
                  <Badge tone="neutral">{event.type}</Badge>
                  {!event.enabled && <Badge tone="danger">Disabled</Badge>}
                  {active && <Badge tone="success">Active now</Badge>}
                </div>
                <p className="mt-1 font-mono text-[9px] text-muted">{event.id}{event.category ? ` · ${event.category}` : ''}</p>
              </div>
              <Button
                icon={<Sparkles size={13} />}
                variant="solid"
                onClick={() => {
                  setSelection({ eventId: event.id });
                  openModal({ kind: 'injectEvent', payload: event.id });
                }}
              >
                Inject
              </Button>
            </div>
            {event.description && <p className="mt-2 text-[11px] leading-relaxed text-muted">{event.description}</p>}
            <dl className="mt-2 grid gap-x-4 gap-y-1 font-mono text-[10px] sm:grid-cols-2">
              <div className="flex justify-between gap-2"><dt className="text-muted">Probability</dt><dd className="text-cyan">{(event.probability * 100).toFixed(1)}%</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Priority</dt><dd className="text-chalk/80">{event.priority}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Cooldown</dt><dd className="text-chalk/80">{event.cooldownSteps !== undefined ? `${event.cooldownSteps} steps` : 'none'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Fired</dt><dd className="text-chalk/80">{records.length}{last ? ` · last step ${last.step}` : ''}</dd></div>
            </dl>
            <p className="mt-2 font-mono text-[10px] text-muted"><span className="text-chalk/70">Trigger:</span> {describeTrigger(event.trigger)}</p>
            <div className="mt-2 border-t border-line/40 pt-2">
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted">Effects</p>
              {event.effects.length === 0 ? (
                <p className="font-mono text-[10px] text-muted">No direct effects</p>
              ) : (
                <ul className="mt-1 space-y-0.5 font-mono text-[10px] text-chalk/70">
                  {event.effects.map((effect, index) => <li key={index}>· {describeEffect(effect)}</li>)}
                </ul>
              )}
            </div>
            {outcomeCount > 0 && (
              <div className="mt-2 border-t border-line/40 pt-2">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted">Outcomes ({outcomeCount})</p>
                <ul className="mt-1 space-y-1 font-mono text-[10px]">
                  {event.outcomes?.map((outcome) => (
                    <li key={outcome.id} className="text-chalk/70">
                      <span className="text-violet">{outcome.name}</span> · {(outcome.probability * 100).toFixed(1)}%
                      {outcome.effects.map((effect, index) => <span key={index} className="ml-1 text-muted">[{describeEffect(effect)}]</span>)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const firedList = (
    <div className="space-y-2 p-3">
      {fired.length === 0 ? (
        <EmptyState title="No events fired" description="Events that fire during simulation steps will be recorded here." />
      ) : [...fired].reverse().map((record) => (
        <div key={record.id} className="border border-line/60 bg-void/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-chalk/90">{record.eventName}</span>
              <Badge tone={severityTone(record.severity)}>{record.severity}</Badge>
              <Badge tone="neutral">{record.source}</Badge>
            </div>
            <span className="font-mono text-[10px] text-cyan">step {record.step} · t={record.time.toFixed(1)}</span>
          </div>
          {record.description && <p className="mt-1 text-[11px] leading-relaxed text-muted">{record.description}</p>}
          <p className="mt-1 font-mono text-[9px] text-muted">
            {record.affectedVariables.length} affected
            {record.probability !== undefined ? ` · probability ${(record.probability * 100).toFixed(1)}%` : ''}
          </p>
        </div>
      ))}
    </div>
  );

  const tabs: readonly TabItem<EventTab>[] = [
    { id: 'catalog', label: 'Definitions', badge: engine.scenario.events.length, content: catalog },
    { id: 'fired', label: 'Fired events', badge: fired.length, content: firedList },
  ];

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Event injection lab"
        title={`Events · ${engine.scenario.name}`}
        description="Event definitions, trigger conditions and the recorded firing history of the active reality."
        actions={
          <Button icon={<Sparkles size={13} />} onClick={() => openModal({ kind: 'injectEvent' })}>
            Inject event
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricCard label="Definitions" value={engine.scenario.events.length} />
        <MetricCard label="Enabled" value={engine.scenario.events.filter((event) => event.enabled).length} />
        <MetricCard label="Fired (timeline)" value={fired.length} />
        <MetricCard label="History entries" value={history.length} />
      </div>
      <Panel title="Event records" subtitle="Scenario definitions and actual engine output" bodyClassName="p-0" className="min-h-0 flex-1">
        <Tabs items={tabs} value={tab} onChange={setTab} />
      </Panel>
    </div>
  );
}
