import { useState } from 'react';
import type { EntityId } from '@/engine/types';
import { useParadox } from '@/state/store';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';

function readEventId(payload: unknown): EntityId | undefined {
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'object' && payload !== null && 'eventId' in payload) {
    const value = (payload as { eventId?: unknown }).eventId;
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}

export function NewBranchModal() {
  const engine = useParadox((state) => state.engine);
  const snapshots = engine?.snapshotsList ?? [];
  const payload = useParadox((state) => state.modal.payload);
  const closeModal = useParadox((state) => state.closeModal);
  const pushToast = useParadox((state) => state.pushToast);
  const [name, setName] = useState('Counterfactual Reality');
  const [snapshotId, setSnapshotId] = useState('');
  const [reason, setReason] = useState(readEventId(payload) ? 'event' : 'manual');
  const eventId = readEventId(payload);

  const submit = (): void => {
    if (!engine || name.trim().length === 0) return;
    const branch = engine.createBranch(name.trim(), snapshotId || undefined, reason, eventId);
    useParadox.setState((state) => ({
      revision: state.revision + 1,
      selection: { ...state.selection, branchId: branch?.id ?? state.selection.branchId },
    }));
    closeModal();
    pushToast(branch ? `Created reality: ${branch.name}` : 'Could not create reality', branch ? 'success' : 'warning');
  };

  return (
    <Modal
      title="Create reality branch"
      onClose={closeModal}
      footer={<>
        <Button onClick={closeModal}>Cancel</Button>
        <Button variant="accent" onClick={submit} disabled={!engine}>Create branch</Button>
      </>}
    >
      <div className="space-y-4">
        <label className="block space-y-1"><span className="font-mono text-[10px] uppercase tracking-wider text-muted">Branch name</span><input value={name} onChange={(event) => setName(event.target.value)} className="h-9 w-full border border-line bg-carbon px-2 text-sm text-chalk" /></label>
        <label className="block space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Divergence source</span>
          <select value={snapshotId} onChange={(event) => setSnapshotId(event.target.value)} className="h-9 w-full border border-line bg-carbon px-2 text-sm text-chalk">
            <option value="">Current live state</option>
            {snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{snapshot.name} · step {snapshot.step}</option>)}
          </select>
        </label>
        <label className="block space-y-1"><span className="font-mono text-[10px] uppercase tracking-wider text-muted">Reason</span><input value={reason} onChange={(event) => setReason(event.target.value)} className="h-9 w-full border border-line bg-carbon px-2 text-sm text-chalk" /></label>
        {eventId && <p className="border border-cyan/20 bg-cyan/5 px-3 py-2 font-mono text-[10px] text-cyan">Event anchor: {eventId}</p>}
        <p className="text-[11px] leading-relaxed text-muted">The new reality receives an isolated deep copy of the selected world state. Its later changes cannot affect the parent branch.</p>
      </div>
    </Modal>
  );
}
