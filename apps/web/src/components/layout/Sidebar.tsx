import { FC } from 'react';
import {
  Receipt,
  CalendarRange,
  TableProperties,
  CheckSquare,
  Settings,
  Plus,
} from 'lucide-react';

export type NavTab = 'landing' | 'months' | 'excel' | 'todo' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onQuickAdd?: () => void;
  className?: string;
}

export const Sidebar: FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onQuickAdd,
  className = '',
}) => {
  const navItems = [
    { id: 'landing' as NavTab, label: 'Active Cycle', icon: Receipt },
    { id: 'months' as NavTab, label: 'Cycle Timeline', icon: CalendarRange },
    { id: 'excel' as NavTab, label: 'Excel Spreadsheet', icon: TableProperties },
    { id: 'todo' as NavTab, label: 'Planned Purchases', icon: CheckSquare },
    { id: 'settings' as NavTab, label: 'Settings & Cloud', icon: Settings },
  ];

  return (
    <aside
      className={`w-[260px] shrink-0 min-h-[calc(100vh-61px)] bg-surface border-r border-border p-4 flex flex-col justify-between ${className}`}
    >
      <div className="flex flex-col gap-3">
        {/* Quick Add Action Button */}
        {onQuickAdd && (
          <button
            type="button"
            onClick={onQuickAdd}
            className="w-full h-10 px-3.5 rounded-btn bg-primary hover:bg-primary-hover text-white flex items-center justify-between shadow-sm transition-all duration-150 group cursor-pointer"
          >
            <div className="flex items-center gap-2 font-semibold text-xs">
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              <span>Record Expense</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white/20 rounded text-white/90">
              N
            </kbd>
          </button>
        )}

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary px-3 mb-1.5 block">
            Navigation
          </span>

          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`w-full h-10 px-3 rounded-btn flex items-center gap-3 transition-colors duration-150 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-primary ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised font-medium'
                  }`}
                >
                  {/* Icon-in-circle motif */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      isActive ? 'bg-primary/15 text-primary' : 'bg-border/50 text-text-secondary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer subtle brand and shortcut indicator */}
      <div className="px-3 py-2 border-t border-border/60 flex flex-col gap-1 text-[11px] text-text-secondary">
        <div className="flex items-center justify-between">
          <span>Ledger v1.0</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-raised border border-border">PKT (+5:00)</span>
        </div>
        <span className="text-[10px] opacity-70">
          Press <kbd className="font-mono font-bold">N</kbd> anytime to record
        </span>
      </div>
    </aside>
  );
};
