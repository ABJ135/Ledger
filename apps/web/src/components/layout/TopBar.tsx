import { FC } from 'react';
import { Sun, Moon, CalendarCheck, LogIn, LogOut, Sparkles } from 'lucide-react';

interface TopBarProps {
  monthLabel?: string;
  isShared: boolean;
  onToggleShared: (shared: boolean) => void;
  activeGroupName?: string;
  onManageShared?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onEndMonthClick?: () => void;
  onOpenAuth?: (mode: 'login' | 'signup' | 'upgrade') => void;
  user?: { email?: string | null; isGuest?: boolean } | null;
  onLogout?: () => void;
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
  onOpenAuth,
  user,
  onLogout,
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
      <div className="flex items-center gap-2.5">
        {/* Auth Status & Action Buttons */}
        {!user ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAuth?.('login')}
              className="h-9 px-3 rounded-btn border border-border hover:bg-surface-raised text-xs font-semibold text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth?.('signup')}
              className="h-9 px-3 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Sign Up</span>
            </button>
          </div>
        ) : user.isGuest ? (
          <div className="flex items-center gap-2">
            <div
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-pill text-xs font-semibold border border-amber-500/25"
              title="You are currently using a temporary guest session"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Guest Session</span>
            </div>
            <button
              type="button"
              onClick={() => onOpenAuth?.('login')}
              className="h-9 px-3 rounded-btn border border-border hover:bg-surface-raised text-xs font-semibold text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Sign in with an existing account"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth?.('signup')}
              className="h-9 px-3 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Create an account and save your data"
            >
              <span>Sign Up</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-surface-raised rounded-pill text-xs font-semibold text-text-primary border border-border"
              title={`Logged in as ${user.email}`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="max-w-[150px] truncate">{user.email}</span>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="h-9 px-2.5 rounded-btn border border-border hover:border-expense-alert/40 text-text-secondary hover:text-expense-alert hover:bg-expense-alert/10 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Sign out of your account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        )}

        {onEndMonthClick && (
          <button
            type="button"
            onClick={onEndMonthClick}
            className="h-9 px-3.5 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-primary shadow-xs cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End Month</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle dark mode"
          className="w-9 h-9 rounded-btn flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors border border-transparent hover:border-border cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
