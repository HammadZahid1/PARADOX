import {
  Activity, BarChart3, Binary, Box, Clock3, FlaskConical, GitBranch,
  History, Layers3, ListTree, Orbit, Settings2, SlidersHorizontal, Sparkles, Workflow,
} from 'lucide-react';
import { useParadox } from '@/state/store';
import type { ViewId } from '@/state/types';
import { Tooltip } from './Tooltip';

export const NAV_ITEMS: Array<{ id: ViewId; label: string; icon: typeof Activity }> = [
  { id: 'universe', label: 'Reality universe', icon: Orbit },
  { id: 'lab', label: 'Simulation lab', icon: FlaskConical },
  { id: 'timeline', label: 'Timeline', icon: Clock3 },
  { id: 'causal', label: 'Causal graph', icon: Workflow },
  { id: 'compare', label: 'Reality comparison', icon: Layers3 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'scenarios', label: 'Scenario library', icon: Binary },
  { id: 'world', label: 'World editor', icon: SlidersHorizontal },
  { id: 'events', label: 'Event injection lab', icon: Sparkles },
  { id: 'explorer', label: 'Reality explorer', icon: ListTree },
  { id: 'decisions', label: 'Decision lab', icon: GitBranch },
  { id: 'snapshots', label: 'Snapshots', icon: Box },
  { id: 'history', label: 'History', icon: History },
  { id: 'monte', label: 'Monte Carlo', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const view = useParadox((state) => state.view);
  const setView = useParadox((state) => state.setView);
  return (
    <nav aria-label="Primary navigation" className={`flex h-full shrink-0 flex-col border-r border-line/70 bg-graphite/70 ${collapsed ? 'w-12' : 'w-48'}`}>
      <div className={`flex h-12 items-center border-b border-line/70 ${collapsed ? 'justify-center' : 'px-4'}`}>
        <div className="h-2 w-2 bg-cyan shadow-glow" />
        {!collapsed && <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.28em] text-chalk">PARADOX</span>}
      </div>
      <div className="flex-1 overflow-auto py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const button = (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? 'page' : undefined}
              className={`flex h-9 w-full items-center gap-3 px-4 text-left font-mono text-[11px] transition-colors ${view === item.id ? 'border-l-2 border-cyan bg-cyan/[0.07] text-cyan' : 'border-l-2 border-transparent text-muted hover:bg-white/5 hover:text-chalk'}`}
            >
              <Icon size={15} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
          return collapsed ? <Tooltip key={item.id} label={item.label}>{button}</Tooltip> : button;
        })}
      </div>
      {!collapsed && (
        <div className="border-t border-line/70 p-3 font-mono text-[9px] leading-relaxed text-muted/70">
          LOCAL SIMULATION<br />NO EXTERNAL SERVICES
        </div>
      )}
    </nav>
  );
}
