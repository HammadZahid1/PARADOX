import { useState } from 'react';
import { useParadox } from '@/state/store';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';

export function SnapshotModal() {
  const engine = useParadox((state) => state.engine);
  const closeModal = useParadox((state) => state.closeModal);
  const [name, setName] = useState(`Checkpoint ${engine?.activeBranch.currentState.step ?? 0}`);
  const [description, setDescription] = useState('');

  const submit = (): void => {
    if (!engine || name.trim().length === 0) return;
    engine.captureSnapshot(name.trim(), 'manual', description.trim() || undefined);
    useParadox.setState((state) => ({ revision: state.revision + 1 }));
    closeModal();
  };

  return (
    <Modal
      title="Create snapshot"
      onClose={closeModal}
      footer={<>
        <Button onClick={closeModal}>Cancel</Button>
        <Button variant="accent" onClick={submit} disabled={!engine}>Save snapshot</Button>
      </>}
    >
      <div className="space-y-4">
        <label className="block space-y-1"><span className="font-mono text-[10px] uppercase tracking-wider text-muted">Name</span><input value={name} onChange={(event) => setName(event.target.value)} className="h-9 w-full border border-line bg-carbon px-2 text-sm text-chalk" /></label>
        <label className="block space-y-1"><span className="font-mono text-[10px] uppercase tracking-wider text-muted">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full border border-line bg-carbon px-2 py-2 text-sm text-chalk" /></label>
        <p className="text-[11px] leading-relaxed text-muted">Snapshots store an isolated deep copy of the active reality at the current step. Branch from a snapshot to explore a counterfactual history.</p>
      </div>
    </Modal>
  );
}
