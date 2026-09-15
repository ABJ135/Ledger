import { FC } from 'react';
import { Sun, Moon, CalendarCheck } from 'lucide-react';

interface TopBarProps {
  monthLabel?: string;
  isShared: boolean;
  onToggleShared: (shared: boolean) => void;
  activeGroupName?: string;
  onManageShared?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onEndMonthClick?: () => void;
}

export const TopBar: FC<TopBarProps> = ({
  monthLabel = 'Current Cycle',
  isShared,
  onToggleShared,
  activeGroupName,
  onManageShared,
  isDark,
  onToggleTheme,
  onEndMonthClick,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border px-7 py-3 flex items-center justify-between">
      {/* Left: Brand mark & Month title in Fraunces */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="font-display font-bold text-sm">L</span>
          </div>
          <div>
            <span className="font-display text-[22px] md:text-[26px] font-semibold text-text-primary tracking-tight leading-none">
              {monthLabel}
            </span>
          </div>
        </div>

        {/* Personal / Shared Toggle Pill */}
        <div className="hidden sm:flex items-center p-1 bg-surface-raised rounded-pill border border-border">
          <button
            type="button"
            onClick={() => onToggleShared(false)}
            className={`px-3 py-1 rounded-pill text-xs font-semibold transition-colors duration-160 ${
              !isShared
                ? 'bg-surface text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Personal
          </button>
          <button
            type="button"
            onClick={() => onToggleShared(true)}
            className={`px-3 py-1 rounded-pill text-xs font-semibold transition-colors duration-160 ${
              isShared
                ? 'bg-surface text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Shared
          </button>
        </div>

        {/* Group Selector Pill when Shared is Active */}
        {isShared && onManageShared && (
          <button
            type="button"
            onClick={onManageShared}
            className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/15 text-primary rounded-pill text-xs font-semibold transition-colors border border-primary/20"
          >
            <span>{activeGroupName || 'Choose Group'}</span>
            <span className="text-[10px] opacity-75">▾</span>
          </button>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {onEndMonthClick && (
          <button
            type="button"
            onClick={onEndMonthClick}
            className="h-10 px-4 rounded-btn bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors duration-160 flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-primary shadow-sm"
          >
            <CalendarCheck className="w-4 h-4" />
            <span className="hidden sm:inline">End Month</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle dark mode"
          className="w-10 h-10 rounded-btn flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors duration-160 border border-transparent hover:border-border"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
