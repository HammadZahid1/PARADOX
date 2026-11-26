import { useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '@/persistence/settings';
import { ParadoxRepository } from '@/persistence/repository';
import { useParadox } from '@/state/store';

/** Hydrates local preferences and saved scenarios, then mirrors changes back to browser storage. */
export function usePersistence(): void {
  const [hydrated, setHydrated] = useState(false);
  const applySettings = useParadox((state) => state.applySettings);
  const importScenarios = useParadox((state) => state.importScenarios);
  const scenarios = useParadox((state) => state.scenarios);
  const reducedMotion = useParadox((state) => state.reducedMotion);
  const showGrid = useParadox((state) => state.showGrid);
  const compactMode = useParadox((state) => state.compactMode);
  const theme = useParadox((state) => state.theme);
  const panelSizes = useParadox((state) => state.panelSizes);
  const activeScenarioId = useParadox((state) => state.workspace.activeScenarioId);

  useEffect(() => {
    applySettings(loadSettings());
    setHydrated(true);
  }, [applySettings]);

  useEffect(() => {
    if (!hydrated) return;
    saveSettings({
      compactMode, reducedMotion, showGrid,
      defaultView: useParadox.getState().view,
      panelSizes: { ...panelSizes },
      theme,
    });
  }, [hydrated, compactMode, reducedMotion, showGrid, panelSizes, theme]);

  useEffect(() => {
    if (!hydrated || typeof indexedDB === 'undefined') return;
    const repository = new ParadoxRepository();
    void repository.getScenarios()
      .then((saved) => {
        const custom = saved.filter((scenario) => !scenario.preset);
        if (custom.length > 0) importScenarios(custom, false);
      })
      .catch(() => undefined);
  }, [hydrated, importScenarios]);

  useEffect(() => {
    if (!hydrated || typeof indexedDB === 'undefined' || !activeScenarioId) return;
    const scenario = scenarios.find((item) => item.id === activeScenarioId);
    if (!scenario) return;
    const repository = new ParadoxRepository();
    void repository.saveScenario(scenario).catch(() => undefined);
  }, [hydrated, activeScenarioId, scenarios]);
}
