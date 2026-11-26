import { useState } from 'react';
import { useParadox } from '@/state/store';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { Slider } from '@/ui/components/Slider';

function readEventId(payload: unknown): string {
  return typeof payload === 'string' ? payload : '';
}

export function InjectEventModal() {
  const engine = useParadox((state) => state.engine);
  const payload = useParadox((state) => state.modal.payload);
  const injectEvent = useParadox((state) => state.injectEvent);
  const closeModal = useParadox((state) => state.closeModal);
  const events = engine?.scenario.events ?? [];
  const [eventId, setEventId] = useState(readEventId(payload) || events[0]?.id || '');
  const [probability, setProbability] = useState(1);
  const [override, setOverride] = useState(true);
  const event = events.find((item) => item.id === eventId);

  const submit = (): void => {
    if (!event) return;
    injectEvent(override ? { ...event, probability } : event);
    closeModal();
  };

  return (
    <Modal
      title="Inject event"
      onClose={closeModal}
      footer={<>
        <Button onClick={closeModal}>Cancel</Button>
        <Button variant="accent" onClick={submit} disabled={!event}>Inject</Button>
      </>}
    >
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Event definition</span>
          <select value={eventId} onChange={(event) => setEventId(event.target.value)} className="h-9 w-full border border-line bg-carbon px-2 text-sm text-chalk">
            {events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        {event && <div className="border border-line/70 bg-carbon/50 p-3">
          <p className="text-sm text-chalk">{event.name}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">{event.description ?? 'No description recorded.'}</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted">{event.severity} · {event.type} · trigger {event.trigger.kind}</p>
        </div>}
        <label className="flex items-center gap-2 font-mono text-[11px] text-chalk/80"><input type="checkbox" checked={override} onChange={(event) => setOverride(event.target.checked)} /> Override probability</label>
        {override && <Slider label="Injection probability" value={probability} min={0} max={1} step={0.05} onChange={setProbability} />}
        <p className="text-[11px] leading-relaxed text-muted">Injection applies this event to the active reality at its current step. Causal effects are recomputed from the resulting state change.</p>
      </div>
    </Modal>
  );
}
