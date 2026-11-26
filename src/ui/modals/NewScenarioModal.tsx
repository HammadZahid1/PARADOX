import { useState } from 'react';
import { useParadox } from '@/state/store';
import { generateScenario } from '@/engine/scenarios/custom';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';

export function NewScenarioModal() {
  const scenarios = useParadox((state) => state.scenarios);
  const registerScenarios = useParadox((state) => state.registerScenarios);
  const loadScenario = useParadox((state) => state.loadScenario);
  const closeModal = useParadox((state) => state.closeModal);
  const setView = useParadox((state) => state.setView);
  const [mode, setMode] = useState<'preset' | 'generate'>('preset');
  const [presetId, setPresetId] = useState(scenarios[0]?.id ?? '');
  const [title, setTitle] = useState('Generated Reality');
  const [domain, setDomain] = useState('custom');
  const [conditions, setConditions] = useState('resources: 100, population: 50');
  const [events, setEvents] = useState('Shock, Discovery');
  const [duration, setDuration] = useState(60);

  const submit = (): void => {
    if (mode === 'preset') {
      if (!presetId) return;
      loadScenario(presetId);
    } else {
      const startingConditions: Record<string, number> = {};
      for (const part of conditions.split(',')) {
        const [key, raw] = part.split(':').map((item) => item.trim());
        if (!key || raw === undefined) continue;
        const value = Number(raw);
        if (Number.isFinite(value)) startingConditions[key] = value;
      }
      const scenario = generateScenario({
        title, domain,
        startingConditions,
        eventNames: events.split(',').map((item) => item.trim()).filter(Boolean),
        duration,
      });
      registerScenarios([scenario]);
      loadScenario(scenario.id);
    }
    closeModal();
    setView('lab');
  };

  return (
    <Modal
      title="New scenario"
      onClose={closeModal}
      footer={<>
        <Button onClick={closeModal}>Cancel</Button>
        <Button variant="accent" onClick={submit}>Open scenario</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button active={mode === 'preset'} onClick={() => setMode('preset')}>Use existing</Button>
          <Button active={mode === 'generate'} onClick={() => setMode('generate')}>Generate locally</Button>
        </div>
        {mode === 'preset' ? (
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Preset library</span>
            <select value={presetId} onChange={(event) => setPresetId(event.target.value)} className="h-9 w-full border border-line bg-carbon px-2 text-sm text-chalk">
              {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name} · {scenario.domain}</option>)}
            </select>
          </label>
        ) : (
          <>
            <label className="block space-y-1"><span className="font-mono text-[10px] uppercase tracking-wider text-muted">Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} className="h-9 w-full border border-line bg-carbon px-2 text-sm text-chalk" /></label>
            <label className="block space-y-1"><span className="font-mono text-[10px] uppercase tracking-wider text-muted">Domain</span><input value={domain} onChange={(event) => setDomain(event.target.value)} className="h-9 w-full border border-line bg-carbon px-2 text-sm text-chalk" /></label>
            <label className="block space-y-1"><span className="font-mono text-[10px] uppercase tracking-wider text-muted">Starting conditions (key: value)</span><input value={conditions} onChange={(event) => setConditions(event.target.value)} className="h-9 w-full border border-line bg-carbon px-2 text-sm text-chalk" /></label>
            <label className="block space-y-1"><span className="font-mono text-[10px] uppercase tracking-wider text-muted">Event names</span><input value={events} onChange={(event) => setEvents(event.target.value)} className="h-9 w-full border border-line bg-carbon px-2 text-sm text-chalk" /></label>
            <label className="block space-y-1"><span className="font-mono text-[10px] uppercase tracking-wider text-muted">Duration (steps)</span><input type="number" min={30} max={200} value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="h-9 w-full border border-line bg-carbon px-2 text-sm text-chalk" /></label>
          </>
        )}
        <p className="border-t border-line/60 pt-3 text-[11px] leading-relaxed text-muted">Generated scenarios are deterministic local templates. They are fictional models for exploration, not real-world forecasts.</p>
      </div>
    </Modal>
  );
}
