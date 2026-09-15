import { FC } from 'react';
import {
  Receipt,
  CalendarRange,
  TableProperties,
  CheckSquare,
  Settings,
} from 'lucide-react';

export type NavTab = 'landing' | 'months' | 'excel' | 'todo' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  className?: string;
}

export const Sidebar: FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  className = '',
}) => {
  const navItems = [
    { id: 'landing' as NavTab, label: 'Active Cycle', icon: Receipt },
    { id: 'months' as NavTab, label: 'Month View', icon: CalendarRange },
    { id: 'excel' as NavTab, label: 'Excel Edit', icon: TableProperties },
    { id: 'todo' as NavTab, label: 'To-Do List', icon: CheckSquare },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`w-[272px] shrink-0 min-h-[calc(100vh-61px)] bg-surface border-r border-border p-4 flex flex-col justify-between ${className}`}
    >
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary px-3 mb-1">
          Navigation
        </span>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full h-11 px-3 rounded-[12px] flex items-center gap-3 transition-colors duration-160 text-left focus-visible:outline-2 focus-visible:outline-primary ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised font-medium'
              }`}
            >
              {/* Icon-in-circle motif */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isActive ? 'bg-primary/15 text-primary' : 'bg-border/40 text-text-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer subtle brand tag */}
      <div className="px-3 py-2 border-t border-border/60">
        <span className="text-[11px] text-text-secondary block">
          Ledger v0.1 • Pakistan (PKT)
        </span>
      </div>
    </aside>
  );
};
