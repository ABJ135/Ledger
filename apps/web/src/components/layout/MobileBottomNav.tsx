import { FC } from 'react';
import {
  Receipt,
  CalendarRange,
  TableProperties,
  CheckSquare,
  Settings,
  Plus,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onQuickAdd?: () => void;
}

export const MobileBottomNav: FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onQuickAdd,
}) => {
  const tabs = [
    { id: 'landing' as NavTab, label: 'Cycle', icon: Receipt },
    { id: 'months' as NavTab, label: 'Months', icon: CalendarRange },
    { id: 'excel' as NavTab, label: 'Excel', icon: TableProperties },
    { id: 'todo' as NavTab, label: 'Wishlist', icon: CheckSquare },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-border px-2 py-1.5 shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto relative">
        {/* Tab 0: Cycle */}
        <button
          type="button"
          onClick={() => onTabChange(tabs[0].id)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === tabs[0].id
              ? 'text-primary font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              activeTab === tabs[0].id ? 'bg-primary/10' : ''
            }`}
          >
            <Receipt className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5">{tabs[0].label}</span>
        </button>

        {/* Tab 1: Months */}
        <button
          type="button"
          onClick={() => onTabChange(tabs[1].id)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === tabs[1].id
              ? 'text-primary font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              activeTab === tabs[1].id ? 'bg-primary/10' : ''
            }`}
          >
            <CalendarRange className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5">{tabs[1].label}</span>
        </button>

        {/* Center: Quick Add Button */}
        {onQuickAdd && (
          <div className="flex-1 flex justify-center -mt-5">
            <button
              type="button"
              onClick={onQuickAdd}
              aria-label="Add transaction"
              className="w-12 h-12 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Tab 2: Excel */}
        <button
          type="button"
          onClick={() => onTabChange(tabs[2].id)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === tabs[2].id
              ? 'text-primary font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              activeTab === tabs[2].id ? 'bg-primary/10' : ''
            }`}
          >
            <TableProperties className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5">{tabs[2].label}</span>
        </button>

        {/* Tab 3: Wishlist */}
        <button
          type="button"
          onClick={() => onTabChange(tabs[3].id)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === tabs[3].id
              ? 'text-primary font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              activeTab === tabs[3].id ? 'bg-primary/10' : ''
            }`}
          >
            <CheckSquare className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5">{tabs[3].label}</span>
        </button>

        {/* Tab 4: Settings */}
        <button
          type="button"
          onClick={() => onTabChange(tabs[4].id)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === tabs[4].id
              ? 'text-primary font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              activeTab === tabs[4].id ? 'bg-primary/10' : ''
            }`}
          >
            <Settings className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5">{tabs[4].label}</span>
        </button>
      </div>
    </nav>
  );
};
