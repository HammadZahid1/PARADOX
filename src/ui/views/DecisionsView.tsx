import { useMemo, useState } from 'react';
import { GitBranch, GitCommitHorizontal } from 'lucide-react';
import { explainRelation } from '@/engine/causal/analysis';
import { nodeByReference } from '@/engine/causal/graph';
import { createDecisionAlternative } from '@/engine/reality/decisions';
import type { DecisionAlternative, EventRecord, RealityBranch, SimulationEvent } from '@/engine/types';
import { useParadox } from '@/state/store';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { MetricCard } from '@/ui/components/MetricCard';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { Tabs, type TabItem } from '@/ui/components/Tabs';
import { Tooltip } from '@/ui/components/Tooltip';

type DecisionTab = 'records' | 'candidates';

interface EventCandidate {
  branch: RealityBranch;
  record: EventRecord;
  definition?: SimulationEvent;
  alternatives: DecisionAlternative[];
  relations: { label: string; detail: string; direction: 'out' | 'in' }[];
}

export function DecisionsView() {
  const engine = useParadox((state) => state.engine);
  const revision = useParadox((state) => state.revision);
  const selection = useParadox((state) => state.selection);
  const setSelection = useParadox((state) => state.setSelection);
  const selectBranch = useParadox((state) => state.selectBranch);
  const openModal = useParadox((state) => state.openModal);
  const [tab, setTab] = useState<DecisionTab>('records');

  const branches = engine?.branchesList ?? [];
  const selectedBranch = engine?.getBranch(selection.branchId ?? '') ?? engine?.activeBranch;

  const decisions = useMemo(() => (engine?.branchesList ?? []).flatMap((branch) =>
    branch.decisions.map((decision) => ({ branch, decision })),
  ).sort((a, b) => b.decision.step - a.decision.step), [engine, revision]);

  const candidates = useMemo<EventCandidate[]>(() => {
    if (!engine) return [];
    const branch = engine.getBranch(selection.branchId ?? '') ?? engine.activeBranch;
    return [...branch.timeline.events].sort((a, b) => b.step - a.step).map((record) => {
      const definition = engine.scenario.events.find((item) => item.id === record.eventId);
      const alternatives = (definition?.outcomes ?? []).map((outcome) =>
        createDecisionAlternative(outcome.name, outcome.probability, outcome.effects, outcome.description),
      );
      const node = nodeByReference(engine.causalGraph, 'event', record.eventId);
      const edges = node ? engine.causalGraph.edges.filter((edge) => edge.from === node.id || edge.to === node.id) : [];
      const relations = edges.map((edge) => {
        const outgoing = node !== undefined && edge.from === node.id;
        const otherId = outgoing ? edge.to : edge.from;
        return {
          label: engine.causalGraph.nodes.find((item) => item.id === otherId)?.label ?? otherId,
          detail: explainRelation(edge.type, edge.strength),
          direction: outgoing ? 'out' as const : 'in' as const,
        };
      });
      return { branch, record, definition, alternatives, relations };
    });
  }, [engine, revision, selection.branchId]);

  const counterfactuals = useMemo(() => (engine?.branchesList ?? []).filter((branch) => branch.parentId !== undefined).map((branch) => {
    const parent = engine?.getBranch(branch.parentId ?? '');
    const record = parent?.timeline.events.find((item) => item.eventId === branch.divergenceEventId);
    return {
      branch,
      parentName: parent?.name ?? branch.parentId ?? 'Unknown parent',
      eventName: record?.eventName ?? branch.divergenceEventId ?? 'Manual divergence',
    };
  }), [engine, revision]);

  if (!engine || !selectedBranch) {
    return <EmptyState title="No decision data" description="Load a scenario with events and branches to explore recorded decisions and counterfactuals." />;
  }

  const renderRecords = () => {
    if (decisions.length === 0) {
      return (
        <EmptyState
          title="No decisions recorded"
          description="Decisions appear here when the engine records an alternative selection. Fired events from the timeline remain available as counterfactual candidates."
        />
      );
    }
    return (
      <ul className="space-y-2">
        {decisions.map(({ branch, decision }) => {
          const chosen = decision.alternatives.find((alternative) => alternative.id === decision.selectedAlternativeId);
          return (
            <li key={decision.id} className="border border-line/60 bg-graphite/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="violet">step {decision.step} · t {decision.time.toFixed(1)}</Badge>
                <span className="text-xs text-chalk">{decision.name}</span>
                <button
                  type="button"
                  onClick={() => selectBranch(branch.id)}
                  className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-cyan/80 hover:text-cyan hover:underline"
                  aria-label={`Select reality ${branch.name}`}
                >
                  <GitBranch size={11} /> {branch.name}
                </button>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{decision.rationale ?? 'No rationale recorded.'}</p>
              <ul className="mt-2 space-y-1 border-t border-line/50 pt-2">
                {decision.alternatives.map((alternative) => (
                  <li key={alternative.id} className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={alternative.id === decision.selectedAlternativeId ? 'text-cyan' : 'text-muted'}>
                      {alternative.name}
                    </span>
                    <Badge tone="neutral">{Math.round(alternative.probability * 100)}%</Badge>
                    {alternative.id === decision.selectedAlternativeId && <Badge tone="success">selected</Badge>}
                    {alternative.description && <span className="text-muted/70">{alternative.description}</span>}
                  </li>
                ))}
              </ul>
              {chosen && <p className="mt-2 font-mono text-[9px] text-muted/70">Chosen path: {chosen.outcome.name}</p>}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderCandidates = () => (
    <div className="space-y-3">
      <label className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Source reality</span>
        <select
          aria-label="Choose source reality for decision candidates"
          value={selectedBranch.id}
          onChange={(event) => {
            const value = event.target.value;
            const match = branches.find((branch) => branch.id === value);
            if (match) setSelection({ branchId: match.id });
          }}
          className="h-8 min-w-0 flex-1 border border-line bg-void px-2 font-mono text-[11px] text-chalk outline-none focus:border-cyan/60"
        >
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </label>
      {candidates.length === 0 ? (
        <EmptyState title="No fired events" description="Run the simulation to record events; each fired event can become a counterfactual branch point." />
      ) : (
        <ul className="space-y-2">
          {candidates.map((candidate) => (
            <li key={`${candidate.branch.id}-${candidate.record.id}`} className="border border-line/60 bg-graphite/40 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="amber">step {candidate.record.step}</Badge>
                    <span className="text-xs text-chalk">{candidate.record.eventName}</span>
                    <Badge tone="neutral">{candidate.record.severity}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">{candidate.definition?.description ?? candidate.record.description ?? 'No authored description recorded.'}</p>
                </div>
                <Tooltip label="Open the new reality dialog with this event as the divergence point">
                  <Button
                    variant="solid"
                    icon={<GitBranch size={12} />}
                    onClick={() => openModal({ kind: 'newBranch', payload: { eventId: candidate.record.eventId } })}
                    aria-label={`Branch from event ${candidate.record.eventName}`}
                  >
                    Branch from event
                  </Button>
                </Tooltip>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[9px] text-muted/80">
                <span>source: {candidate.record.source}</span>
                <span aria-hidden="true">·</span>
                <span>id: {candidate.record.eventId}</span>
                {candidate.record.probability !== undefined && <span>probability: {candidate.record.probability.toFixed(2)}</span>}
              </div>
              <div className="mt-2 border-t border-line/50 pt-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Authored alternatives</p>
                {candidate.alternatives.length === 0 ? (
                  <p className="mt-1 text-[11px] text-muted/70">No outcome alternatives are authored for this event; branching records the event as the divergence point.</p>
                ) : (
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {candidate.alternatives.map((alternative) => (
                      <li key={alternative.id}>
                        <Tooltip label={`${alternative.outcome.effects.length} recorded effects`}>
                          <Badge tone="cyan">{alternative.name} · {Math.round(alternative.probability * 100)}%</Badge>
                        </Tooltip>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {candidate.relations.length > 0 && (
                <div className="mt-2 border-t border-line/50 pt-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Causal graph links</p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {candidate.relations.map((relation, index) => (
                      <li key={`${candidate.record.id}-${relation.label}-${index}`}>
                        <Tooltip label={relation.detail}>
                          <Badge tone={relation.direction === 'out' ? 'violet' : 'neutral'}>
                            {relation.direction === 'out' ? '→' : '←'} {relation.label}
                          </Badge>
                        </Tooltip>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const tabs: readonly TabItem<DecisionTab>[] = [
    { id: 'records', label: 'Recorded decisions', badge: decisions.length, content: <div className="p-3">{renderRecords()}</div> },
    { id: 'candidates', label: 'Event candidates', badge: candidates.length, content: <div className="p-3">{renderCandidates()}</div> },
  ];

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Counterfactual lab"
        title="Decision points"
        description="Recorded choices and real, fired events are the only inputs here. Branching from an event opens the creation dialog with that event as the divergence point."
        actions={<Badge tone="violet">{branches.length} realities tracked</Badge>}
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricCard label="Decision records" value={decisions.length} />
        <MetricCard label="Event candidates" value={candidates.length} hint={selectedBranch.name} />
        <MetricCard label="Counterfactual branches" value={counterfactuals.length} />
        <MetricCard label="Current event log" value={selectedBranch.timeline.events.length} />
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel title="Decision analysis" subtitle="Engine records and timeline-derived candidates" className="min-h-[280px]" bodyClassName="p-0">
          <Tabs items={tabs} value={tab} onChange={setTab} />
        </Panel>
        <Panel title="Counterfactual branches" subtitle="Realities created from a parent divergence" bodyClassName="space-y-2 p-3">
          {counterfactuals.length === 0 ? (
            <EmptyState title="No counterfactuals yet" description="Create a branch from a recorded event to see it listed here with its actual divergence point." />
          ) : (
            <ul className="space-y-2">
              {counterfactuals.map(({ branch, parentName, eventName }) => (
                <li key={branch.id} className={`border p-2 ${selection.branchId === branch.id ? 'border-cyan/40 bg-cyan/[0.06]' : 'border-line/60 bg-graphite/40'}`}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: branch.color }} aria-hidden="true" />
                    <span className="truncate text-xs text-chalk">{branch.name}</span>
                  </div>
                  <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted">
                    from {parentName} · step {branch.branchPointStep}
                  </p>
                  <p className="mt-0.5 flex items-start gap-1 text-[10px] leading-relaxed text-muted/80">
                    <GitCommitHorizontal size={11} className="mt-0.5 shrink-0" /> {eventName}
                  </p>
                  {branch.divergenceReason && <p className="mt-0.5 text-[10px] text-muted/70">{branch.divergenceReason}</p>}
                  <Button className="mt-2 w-full" onClick={() => selectBranch(branch.id)}>Make active</Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
