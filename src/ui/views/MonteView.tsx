import { useEffect, useRef, useState } from 'react';
import { Activity, Play, Square } from 'lucide-react';
import type { MonteCarloRequest, MonteCarloResult, MonteCarloRun, Scenario } from '@/engine/types';
import { deriveSeed, runMonteCarlo, type MonteProgress, type MonteSimulate } from '@/engine/monte/runner';
import { computeDistributionStatistics } from '@/engine/monte/statistics';
import { SimulationEngine } from '@/engine/simulation/engine';
import { useParadox } from '@/state/store';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { Histogram } from '@/ui/components/Histogram';
import { MetricCard } from '@/ui/components/MetricCard';
import { Panel } from '@/ui/components/Panel';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { Slider } from '@/ui/components/Slider';
import { Sparkline } from '@/ui/components/Sparkline';
import { formatValue } from '@/utils/format';

const CHUNK_SIZE = 8;

export function MonteView() {
  const engine = useParadox((state) => state.engine);
  const pushToast = useParadox((state) => state.pushToast);
  const scenario = engine?.scenario ?? null;
  const definitions = scenario?.variables ?? [];

  const [variableKey, setVariableKey] = useState('');
  const [runs, setRuns] = useState(60);
  const [maxSteps, setMaxSteps] = useState(40);
  const [baseSeed, setBaseSeed] = useState(1337);
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [progress, setProgress] = useState<MonteProgress | null>(null);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);
  const tokenRef = useRef(0);

  useEffect(() => () => {
    tokenRef.current += 1;
    cancelRef.current = true;
  }, []);

  const activeKey = variableKey && definitions.some((definition) => definition.key === variableKey)
    ? variableKey
    : definitions[0]?.key ?? '';
  const activeDefinition = definitions.find((definition) => definition.key === activeKey);

  const recentRuns: Array<{ run: MonteCarloRun; value: number; index: number }> = result
    ? result.runs.map((run, index) => ({ run, value: result.values[index] ?? Number.NaN, index })).slice(-8).reverse()
    : [];
  const percent = progress ? Math.min(100, Math.round((progress.completed / Math.max(progress.total, 1)) * 100)) : 0;

  const handleRun = () => {
    if (!scenario || !activeKey) return;
    const token = tokenRef.current + 1;
    tokenRef.current = token;
    cancelRef.current = false;
    setRunning(true);
    setResult(null);
    setProgress({ completed: 0, total: runs, runIndex: 0, seed: deriveSeed(baseSeed, 0), value: null, cancelled: false });

    const request: MonteCarloRequest = {
      scenarioId: scenario.id,
      runs,
      baseSeed,
      maxSteps,
      variableKey: activeKey,
      sampleEvery: Math.max(1, Math.floor(maxSteps / 20)),
    };
    const startedAt = performance.now();
    const collectedRuns: MonteCarloRun[] = [];
    const collectedValues: number[] = [];

    const finish = (cancelled: boolean) => {
      if (tokenRef.current !== token) return;
      setResult({
        request,
        statistics: computeDistributionStatistics(collectedValues),
        values: collectedValues,
        runs: collectedRuns,
        elapsedMs: Math.max(0, performance.now() - startedAt),
        cancelled,
      });
      setRunning(false);
      pushToast(
        cancelled ? `Monte Carlo cancelled after ${collectedValues.length} runs` : `Monte Carlo completed: ${collectedValues.length} runs`,
        cancelled ? 'warning' : 'success',
      );
    };

    const runChunk = (offset: number) => {
      if (tokenRef.current !== token) return;
      if (cancelRef.current || offset >= request.runs) {
        finish(cancelRef.current);
        return;
      }

      const chunkRuns = Math.min(CHUNK_SIZE, request.runs - offset);
      // Each chunk gets its own seed family, keeping trials deterministic across chunks.
      const chunkBaseSeed = deriveSeed(request.baseSeed, offset);
      const simulate: MonteSimulate = (seed) => {
        const clone: Scenario = {
          ...scenario,
          configuration: { ...scenario.configuration, seed },
        };
        const local = new SimulationEngine(clone);
        local.run(request.maxSteps);
        return { finalState: local.activeBranch.currentState, timeline: local.activeBranch.timeline };
      };

      const chunk = runMonteCarlo(
        { ...request, runs: chunkRuns, baseSeed: chunkBaseSeed },
        simulate,
        {
          onProgress: (update) => setProgress({
            completed: offset + update.completed,
            total: request.runs,
            runIndex: offset + update.runIndex,
            seed: update.seed,
            value: update.value,
            cancelled: update.cancelled,
          }),
          shouldCancel: () => cancelRef.current || tokenRef.current !== token,
        },
      );
      collectedRuns.push(...chunk.runs);
      collectedValues.push(...chunk.values);

      const next = offset + chunkRuns;
      if (cancelRef.current || next >= request.runs) {
        finish(cancelRef.current);
        return;
      }
      window.setTimeout(() => runChunk(next), 0);
    };

    window.setTimeout(() => runChunk(0), 0);
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setProgress((current) => (current ? { ...current, cancelled: true } : current));
  };

  if (!engine || !scenario) {
    return <EmptyState title="No Monte Carlo study" description="Load a scenario to sample outcomes from locally constructed simulation engines." />;
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionHeader
        eyebrow="Monte Carlo"
        title="Outcome sampling"
        description="Each trial runs an isolated engine built from a cloned scenario; the live workspace engine is never modified."
        actions={<>
          <Button variant="accent" icon={<Play size={13} />} disabled={running || !activeKey} onClick={handleRun}>Run batch</Button>
          <Button variant="danger" icon={<Square size={12} />} disabled={!running} onClick={handleCancel}>Cancel</Button>
        </>}
      />

      <Panel
        title="Batch progress"
        subtitle={`${scenario.name} · ${activeDefinition?.name ?? 'no variable'} · ${requestSummary(runs, maxSteps)}`}
        actions={<Badge tone={progress?.cancelled ? 'danger' : running ? 'cyan' : 'neutral'}>{progress?.cancelled ? 'cancelled' : running ? 'running' : result ? 'complete' : 'idle'}</Badge>}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-[10px] text-muted">
            <span>{progress?.completed ?? 0} / {progress?.total ?? runs} trials</span>
            <span>{percent}%</span>
          </div>
          <div className="h-1 w-full bg-line">
            <div className="h-full bg-cyan transition-all" style={{ width: `${percent}%` }} />
          </div>
          {progress?.value !== null && progress?.value !== undefined && (
            <p className="font-mono text-[10px] text-cyan">last outcome: {formatValue(progress.value)} · seed {progress.seed}</p>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <MetricCard label="Trials" value={result?.statistics.count ?? 0} />
        <MetricCard label="Mean" value={formatValue(result?.statistics.mean)} />
        <MetricCard label="Median" value={formatValue(result?.statistics.median)} />
        <MetricCard label="Std dev" value={formatValue(result?.statistics.stdDev)} />
        <MetricCard label="P05 / P95" value={`${formatValue(result?.statistics.p05)} / ${formatValue(result?.statistics.p95)}`} />
        <MetricCard label="Elapsed" value={result ? result.elapsedMs.toFixed(0) : '—'} unit={result ? 'ms' : undefined} />
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Panel title="Study settings" subtitle="Bounded for interactive runs">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] text-chalk/80">Outcome variable</span>
              <select
                aria-label="Outcome variable"
                value={activeKey}
                onChange={(event) => setVariableKey(event.target.value)}
                disabled={running}
                className="h-8 w-full border border-line bg-graphite px-2 font-mono text-[11px] text-chalk disabled:opacity-40"
              >
                {definitions.map((definition) => <option key={definition.id} value={definition.key}>{definition.name}</option>)}
              </select>
            </label>
            <Slider label="Runs" value={runs} min={10} max={200} step={10} onChange={setRuns} disabled={running} />
            <Slider label="Max steps" value={maxSteps} min={5} max={120} step={5} onChange={setMaxSteps} disabled={running} />
            <Slider label="Base seed" value={baseSeed} min={0} max={9999} step={1} onChange={setBaseSeed} disabled={running} />
            <p className="border-t border-line/60 pt-3 font-mono text-[10px] leading-relaxed text-muted/80">
              Seeds are derived deterministically per trial. Partial batches are preserved when cancelled.
            </p>
          </div>
        </Panel>

        <div className="grid min-h-0 gap-3 md:grid-rows-[minmax(220px,1fr)_minmax(180px,0.8fr)]">
          <Panel title="Outcome distribution" subtitle={`${result?.statistics.count ?? 0} finite samples · 95% CI ${formatValue(result?.statistics.ci95Low)} – ${formatValue(result?.statistics.ci95High)}`}>
            {result ? (
              <Histogram bins={result.statistics.histogram} color="#3ddbd9" height={180} />
            ) : (
              <EmptyState title="No distribution yet" description="Run a batch to generate a histogram of final variable values." />
            )}
          </Panel>
          <div className="grid min-h-0 gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
            <Panel title="Recent trials" subtitle="Seed and sampled outcome" bodyClassName="p-0">
              {recentRuns.length === 0 ? (
                <p className="p-3 font-mono text-[10px] text-muted">No trials recorded.</p>
              ) : (
                <table className="w-full border-collapse font-mono text-[10px]">
                  <thead className="sticky top-0 bg-carbon/95 text-muted">
                    <tr className="border-b border-line/70 text-left">
                      <th className="px-2 py-1.5 font-normal">#</th>
                      <th className="px-2 py-1.5 font-normal">Seed</th>
                      <th className="px-2 py-1.5 font-normal">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRuns.map(({ run, value, index }) => (
                      <tr key={`${run.seed}-${index}`} className="border-b border-line/40">
                        <td className="px-2 py-1.5 text-muted">{index + 1}</td>
                        <td className="px-2 py-1.5 text-muted">{run.seed}</td>
                        <td className="px-2 py-1.5 text-cyan">{formatValue(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
            <Panel title="Sample sequence" subtitle={`${result?.values.length ?? 0} trials in run order`}>
              <Sparkline values={result?.values ?? []} color="#a78bfa" width={220} height={64} />
              <p className="mt-2 font-mono text-[10px] text-muted">min {formatValue(result?.statistics.min)} · max {formatValue(result?.statistics.max)}</p>
            </Panel>
          </div>
        </div>
      </div>
      <p className="flex items-center gap-2 font-mono text-[9px] text-muted/70"><Activity size={11} /> Local engines only · store engine and branches remain untouched.</p>
    </div>
  );
}

function requestSummary(runs: number, maxSteps: number): string {
  return `${runs} runs × ${maxSteps} steps`;
}
