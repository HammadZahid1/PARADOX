import { useMemo } from 'react';
import { scaleLinear } from 'd3-scale';
import { GitBranch } from 'lucide-react';
import { analyzeEventImpact, explainRelation } from '@/engine/causal/analysis';
import { layoutGraph, type GraphLayoutMode } from '@/engine/causal/layout';
import type { CausalNode, CausalRelationship, EntityId } from '@/engine/types';
import { useParadox } from '@/state/store';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';

const GRAPH_WIDTH = 960;
const GRAPH_HEIGHT = 560;

const MODES: readonly GraphLayoutMode[] = ['hierarchical', 'radial', 'circular', 'force'];
const MODE_LABELS: Record<GraphLayoutMode, string> = {
  hierarchical: 'Hierarchical',
  radial: 'Radial',
  circular: 'Circular',
  force: 'Force',
};

type EdgeTone = 'muted' | 'cyan' | 'danger' | 'amber';

const EDGE_TONES: readonly EdgeTone[] = ['muted', 'cyan', 'danger', 'amber'];
const NODE_KINDS: readonly CausalNode['kind'][] = ['variable', 'event', 'metric', 'decision', 'outcome'];

const EDGE_COLORS: Record<EdgeTone, string> = {
  muted: '#596472',
  cyan: '#3ddbd9',
  danger: '#e25656',
  amber: '#e5a94c',
};

function relationTone(edge: CausalRelationship): EdgeTone {
  if (!edge.enabled) return 'muted';
  if (edge.type === 'correlates-with') return 'amber';
  return edge.strength < 0 ? 'danger' : 'cyan';
}

function nodeColor(kind: CausalNode['kind']): string {
  switch (kind) {
    case 'event': return '#e5a94c';
    case 'metric': return '#60a5fa';
    case 'decision': return '#8b7cf6';
    case 'outcome': return '#f472b6';
    default: return '#3ddbd9';
  }
}

export function CausalView() {
  const engine = useParadox((state) => state.engine);
  const revision = useParadox((state) => state.revision);
  const selection = useParadox((state) => state.selection);
  const setSelection = useParadox((state) => state.setSelection);
  const graphLayout = useParadox((state) => state.graphLayout);
  const setGraphLayout = useParadox((state) => state.setGraphLayout);

  const graph = engine?.causalGraph;
  const positions = useMemo(
    () => (graph ? layoutGraph(graph, graphLayout, GRAPH_WIDTH, GRAPH_HEIGHT) : {}),
    [graph, graphLayout, revision],
  );
  const widthScale = useMemo(
    () => scaleLinear().domain([0, 1]).range([1, 2.6]).clamp(true),
    [],
  );

  const selectedNode = graph?.nodes.find((node) => node.id === selection.nodeId) ?? graph?.nodes[0];
  const nodeById = useMemo(
    () => new Map((graph?.nodes ?? []).map((node) => [node.id, node])),
    [graph],
  );
  const incoming = selectedNode && graph ? graph.edges.filter((edge) => edge.to === selectedNode.id) : [];
  const outgoing = selectedNode && graph ? graph.edges.filter((edge) => edge.from === selectedNode.id) : [];

  const impact = useMemo(() => {
    if (!engine || !graph || !selectedNode || selectedNode.kind !== 'event') return undefined;
    const branch = engine.getBranch(selection.branchId ?? '') ?? engine.activeBranch;
    const record = branch.timeline.events.filter((item) => item.eventId === selectedNode.refId).at(-1);
    if (!record) return undefined;
    const before = engine.getStateAt(branch.id, Math.max(0, record.step - 1));
    const after = engine.getStateAt(branch.id, record.step);
    if (!before || !after) return undefined;
    return analyzeEventImpact({
      eventId: selectedNode.refId,
      graph,
      before,
      after,
      definitions: engine.definitions,
      history: branch.timeline.events,
      propagationSteps: [],
    });
  }, [engine, graph, selectedNode, selection.branchId, revision]);

  if (!engine || !graph) {
    return <EmptyState title="No causal graph" description="Load a scenario to inspect its authored causal relationships." />;
  }

  const selectedBranch = engine.getBranch(selection.branchId ?? '') ?? engine.activeBranch;
  const definition = selectedNode ? engine.definitions.find((item) => item.id === selectedNode.refId) : undefined;
  const eventDefinition = selectedNode ? engine.scenario.events.find((item) => item.id === selectedNode.refId) : undefined;
  const eventRecord = eventDefinition
    ? selectedBranch.timeline.events.filter((item) => item.eventId === eventDefinition.id).at(-1)
    : undefined;

  const renderEdgeRow = (edge: CausalRelationship, otherId: EntityId, direction: 'incoming' | 'outgoing') => {
    const other = nodeById.get(otherId);
    return (
      <button
        key={`${direction}-${edge.id}`}
        type="button"
        onClick={() => { if (other) setSelection({ nodeId: other.id }); }}
        className="flex w-full flex-col gap-0.5 border-b border-line/40 px-2 py-2 text-left last:border-b-0 hover:bg-white/[0.03]"
      >
        <span className="flex items-center gap-2">
          <i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: other ? nodeColor(other.kind) : EDGE_COLORS[relationTone(edge)] }} />
          <span className="font-mono text-[10px] text-muted">{direction === 'incoming' ? '←' : '→'}</span>
          <span className="truncate font-mono text-[10px] text-chalk/85">{other?.label ?? otherId}</span>
        </span>
        <span className="pl-5 font-mono text-[9px] text-muted">{explainRelation(edge.type, edge.strength)}</span>
        {!edge.enabled && <span className="pl-5"><Badge tone="amber">disabled</Badge></span>}
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Causal structure"
        title="Causal graph"
        description="Nodes and signed relationships come from the active scenario's authored graph; nothing is inferred from correlation."
        actions={MODES.map((mode) => (
          <Button key={mode} active={graphLayout === mode} onClick={() => setGraphLayout(mode)}>{MODE_LABELS[mode]}</Button>
        ))}
      />
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_330px]">
        <Panel
          title="Relationship map"
          subtitle={`${graph.nodes.length} nodes · ${graph.edges.length} relations · ${MODE_LABELS[graphLayout]} layout`}
          bodyClassName="p-0"
        >
          <svg
            viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
            width="100%"
            className="block min-h-[420px]"
            role="img"
            aria-label="Causal relationship graph"
          >
            <defs>
              <pattern id="causal-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a2029" strokeWidth="0.5" />
              </pattern>
              {EDGE_TONES.map((tone) => (
                <marker
                  key={tone}
                  id={`causal-arrow-${tone}`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLORS[tone]} />
                </marker>
              ))}
            </defs>
            <rect width={GRAPH_WIDTH} height={GRAPH_HEIGHT} fill="url(#causal-grid)" />
            {graph.edges.map((edge) => {
              const from = positions[edge.from];
              const to = positions[edge.to];
              if (!from || !to) return null;
              const tone = relationTone(edge);
              const highlighted = edge.from === selectedNode?.id || edge.to === selectedNode?.id;
              return (
                <line
                  key={edge.id}
                  data-edge-id={edge.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={EDGE_COLORS[tone]}
                  strokeWidth={widthScale(Math.abs(edge.strength))}
                  strokeDasharray={!edge.enabled || edge.type === 'correlates-with' ? '5 4' : undefined}
                  markerEnd={`url(#causal-arrow-${tone})`}
                  opacity={highlighted ? 1 : 0.55}
                >
                  <title>
                    {`${nodeById.get(edge.from)?.label ?? edge.from} → ${nodeById.get(edge.to)?.label ?? edge.to}: ${explainRelation(edge.type, edge.strength)}`}
                  </title>
                </line>
              );
            })}
            {graph.nodes.map((node) => {
              const point = positions[node.id];
              if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
              const active = node.id === selectedNode?.id;
              const color = nodeColor(node.kind);
              const label = node.label.length > 24 ? `${node.label.slice(0, 23)}…` : node.label;
              return (
                <g
                  key={node.id}
                  data-node-id={node.id}
                  transform={`translate(${point.x} ${point.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect causal node ${node.label}`}
                  className="cursor-pointer"
                  onClick={() => setSelection({ nodeId: node.id })}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                      keyEvent.preventDefault();
                      setSelection({ nodeId: node.id });
                    }
                  }}
                >
                  <title>{`${node.label} · ${node.kind}`}</title>
                  <circle r={active ? 12 : 9} fill="#05080c" stroke={color} strokeWidth={active ? 2.5 : 1.4} />
                  <circle r={active ? 5 : 3.5} fill={color} opacity={0.9} />
                  <text x={16} y={4} fontSize={10} fontFamily="monospace" fill={active ? '#e8f7f7' : '#a9b4c0'}>{label}</text>
                </g>
              );
            })}
          </svg>
          <div className="flex flex-wrap gap-3 border-t border-line/50 px-3 py-2 font-mono text-[9px] text-muted">
            <span className="flex items-center gap-1.5"><i className="h-1.5 w-4 bg-cyan" />positive influence</span>
            <span className="flex items-center gap-1.5"><i className="h-1.5 w-4 bg-danger" />inverse influence</span>
            <span className="flex items-center gap-1.5"><i className="h-1.5 w-4 bg-amber" />correlation (non-causal)</span>
            <span className="flex items-center gap-1.5"><i className="h-1.5 w-4 border border-line" />disabled relation</span>
          </div>
        </Panel>
        <div className="flex min-h-0 flex-col gap-3">
          <Panel title="Node inspector" subtitle={selectedNode ? selectedNode.kind : 'No selection'} className="flex-1">
            {selectedNode ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[12px] text-chalk">{selectedNode.label}</span>
                  <Badge tone={selectedNode.kind === 'event' ? 'amber' : selectedNode.kind === 'outcome' ? 'violet' : 'cyan'}>{selectedNode.kind}</Badge>
                </div>
                {selectedNode.description && <p className="text-[11px] leading-relaxed text-muted">{selectedNode.description}</p>}
                <dl className="space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between gap-2"><dt className="text-muted">Node</dt><dd className="max-w-[180px] truncate text-chalk/80">{selectedNode.id}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted">Reference</dt><dd className="max-w-[180px] truncate text-chalk/80">{selectedNode.refId}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted">Position</dt><dd className="text-chalk/80">{positions[selectedNode.id] ? `${positions[selectedNode.id]?.x.toFixed(0)}, ${positions[selectedNode.id]?.y.toFixed(0)}` : '—'}</dd></div>
                  {definition && (
                    <>
                      <div className="flex justify-between gap-2"><dt className="text-muted">Variable</dt><dd className="text-chalk/80">{definition.key}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-muted">Type</dt><dd className="text-chalk/80">{definition.type}{definition.unit ? ` · ${definition.unit}` : ''}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-muted">Current value</dt><dd className="text-cyan">{String(selectedBranch.currentState.variables[definition.id] ?? '—')}</dd></div>
                    </>
                  )}
                  {definition?.description && <p className="pt-1 text-[10px] leading-relaxed text-muted">{definition.description}</p>}
                  {eventDefinition && (
                    <>
                      <div className="flex justify-between gap-2"><dt className="text-muted">Event type</dt><dd className="text-chalk/80">{eventDefinition.type}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-muted">Severity</dt><dd className="text-chalk/80">{eventDefinition.severity}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-muted">Last firing</dt><dd className="text-chalk/80">{eventRecord ? `step ${eventRecord.step} · t ${eventRecord.time.toFixed(1)}` : 'not recorded'}</dd></div>
                    </>
                  )}
                </dl>
                <div>
                  <p className="border-t border-line/60 pt-2 font-mono text-[10px] uppercase tracking-wider text-muted">Incoming ({incoming.length})</p>
                  <div className="mt-1 border border-line/40">
                    {incoming.length > 0
                      ? incoming.map((edge) => renderEdgeRow(edge, edge.from, 'incoming'))
                      : <p className="px-2 py-2 font-mono text-[10px] text-muted">No incoming relations.</p>}
                  </div>
                </div>
                <div>
                  <p className="border-t border-line/60 pt-2 font-mono text-[10px] uppercase tracking-wider text-muted">Outgoing ({outgoing.length})</p>
                  <div className="mt-1 border border-line/40">
                    {outgoing.length > 0
                      ? outgoing.map((edge) => renderEdgeRow(edge, edge.to, 'outgoing'))
                      : <p className="px-2 py-2 font-mono text-[10px] text-muted">No outgoing relations.</p>}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="No nodes" description="This scenario has no causal nodes to inspect." />
            )}
          </Panel>
          {impact && (
            <Panel title="Impact trace" subtitle={`event ${impact.eventId}`}>
              <dl className="space-y-1 font-mono text-[10px]">
                <div className="flex justify-between gap-2"><dt className="text-muted">Affected variables</dt><dd className="text-cyan">{impact.affectedVariables.length}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted">Max propagation depth</dt><dd className="text-chalk/80">{impact.maxDepth}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted">Traced paths</dt><dd className="text-chalk/80">{impact.paths.length}</dd></div>
              </dl>
              {impact.affectedVariables.length > 0 && <p className="mt-2 break-words font-mono text-[9px] text-muted">{impact.affectedVariables.join(', ')}</p>}
              <p className="mt-2 text-[9px] leading-relaxed text-muted/80">{impact.assumptions[0]}</p>
            </Panel>
          )}
          <Panel title="Legend" subtitle="Kinds and relation semantics">
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px] text-muted">
              {NODE_KINDS.map((kind) => (
                <span key={kind} className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full" style={{ background: nodeColor(kind) }} />{kind}</span>
              ))}
            </div>
            <p className="mt-2 border-t border-line/50 pt-2 text-[10px] leading-relaxed text-muted">{explainRelation('causes', 1)} · {explainRelation('reduces', -0.6)}</p>
          </Panel>
        </div>
      </div>
      <p className="flex items-center gap-2 font-mono text-[9px] text-muted/70"><GitBranch size={11} /> Fictional educational model: relations are authored simulation rules, not empirical causal inference.</p>
    </div>
  );
}
