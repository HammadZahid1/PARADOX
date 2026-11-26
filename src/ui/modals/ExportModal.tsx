import { useMemo, useState } from 'react';
import { useParadox } from '@/state/store';
import { downloadText, exportScenario, exportSnapshot, exportWorkspace } from '@/io/export';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';

type ExportKind = 'scenario' | 'workspace' | 'snapshot';

export function ExportModal() {
  const engine = useParadox((state) => state.engine);
  const scenarios = useParadox((state) => state.scenarios);
  const workspace = useParadox((state) => state.workspace);
  const closeModal = useParadox((state) => state.closeModal);
  const [kind, setKind] = useState<ExportKind>('scenario');
  const [scenarioId, setScenarioId] = useState(engine?.scenario.id ?? scenarios[0]?.id ?? '');
  const [snapshotId, setSnapshotId] = useState(engine?.snapshotsList[0]?.id ?? '');

  const text = useMemo(() => {
    if (kind === 'workspace') return exportWorkspace(workspace, scenarios);
    if (kind === 'snapshot') {
      const snapshot = engine?.snapshotsList.find((item) => item.id === snapshotId);
      return snapshot ? exportSnapshot(snapshot) : '';
    }
    const scenario = scenarios.find((item) => item.id === scenarioId);
    return scenario ? exportScenario(scenario) : '';
  }, [kind, workspace, scenarios, engine, scenarioId, snapshotId]);

  return (
    <Modal
      title="Export local data"
      onClose={closeModal}
      footer={<>
        <Button onClick={closeModal}>Close</Button>
        <Button variant="accent" disabled={text.length === 0} onClick={() => downloadText(`paradox-${kind}.json`, text)}>Download JSON</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['scenario', 'workspace', 'snapshot'] as const).map((item) => <Button key={item} active={kind === item} onClick={() => setKind(item)}>{item}</Button>)}
        </div>
        {kind === 'scenario' && <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} className="h-9 w-full border border-line bg-carbon px-2 text-sm text-chalk">{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select>}
        {kind === 'snapshot' && <select value={snapshotId} onChange={(event) => setSnapshotId(event.target.value)} className="h-9 w-full border border-line bg-carbon px-2 text-sm text-chalk">{(engine?.snapshotsList ?? []).map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{snapshot.name} · step {snapshot.step}</option>)}</select>}
        <pre className="max-h-48 overflow-auto border border-line/70 bg-void/70 p-2 font-mono text-[9px] leading-relaxed text-muted">{text.slice(0, 4000) || 'No data available'}</pre>
        <p className="text-[11px] leading-relaxed text-muted">Exports contain only local scenario, workspace and snapshot data. Global state is never modified.</p>
      </div>
    </Modal>
  );
}
