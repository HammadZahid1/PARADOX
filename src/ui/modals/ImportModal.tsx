import { useState } from 'react';
import { useParadox } from '@/state/store';
import { createImportPlan } from '@/io/import';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';

export function ImportModal() {
  const registerScenarios = useParadox((state) => state.registerScenarios);
  const loadScenario = useParadox((state) => state.loadScenario);
  const closeModal = useParadox((state) => state.closeModal);
  const pushToast = useParadox((state) => state.pushToast);
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');

  const submit = (): void => {
    const plan = createImportPlan(text);
    if (!plan) { setMessage('Invalid JSON or PARADOX envelope.'); return; }
    if (!plan.payload) { setMessage(plan.issues.map((issue) => issue.message).join(' · ')); return; }
    if (plan.payload.format === 'paradox-scenario') {
      registerScenarios([plan.payload.scenario]);
      loadScenario(plan.payload.scenario.id);
    } else if (plan.payload.format === 'paradox-workspace') {
      registerScenarios(plan.payload.scenarios);
      const first = plan.payload.scenarios[0];
      if (first) loadScenario(first.id);
    } else {
      setMessage('Snapshot envelopes can be inspected but are not loaded as scenarios.');
      return;
    }
    closeModal();
    pushToast('Local import completed', 'success');
  };

  return (
    <Modal
      title="Import local data"
      onClose={closeModal}
      footer={<>
        <Button onClick={closeModal}>Cancel</Button>
        <Button variant="accent" onClick={submit} disabled={text.trim().length === 0}>Import</Button>
      </>}
    >
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">PARADOX JSON file</span>
          <input type="file" accept="application/json,.json" onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) setText(await file.text());
          }} className="w-full text-xs text-muted file:mr-2 file:border file:border-line file:bg-carbon file:px-2 file:py-1 file:text-chalk" />
        </label>
        <label className="block space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Or paste envelope JSON</span>
          <textarea value={text} onChange={(event) => { setText(event.target.value); setMessage(''); }} rows={8} className="w-full border border-line bg-carbon px-2 py-2 font-mono text-[10px] text-chalk" placeholder='{"format":"paradox-scenario","version":1,"payload":{…}}' />
        </label>
        {message && <p role="alert" className="border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">{message}</p>}
        <p className="text-[11px] leading-relaxed text-muted">Import is validated locally before entering the store. No network requests are made.</p>
      </div>
    </Modal>
  );
}
