import { useState, useEffect } from 'react';
import { TopBar } from './components/layout/TopBar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { LandingPage } from './pages/LandingPage';
import { MonthViewPage } from './pages/MonthViewPage';
import { TodoPage } from './pages/TodoPage';
import { ExcelEditPage } from './pages/ExcelEditPage';
import { SettingsPage } from './pages/SettingsPage';
import { MonthEndModal } from './components/expense/MonthEndModal';
import { SharedExpenseModal } from './components/shared/SharedExpenseModal';
import { QuickExpenseModal } from './components/expense/QuickExpenseModal';
import { AuthModal, AuthModalMode } from './components/auth/AuthModal';
import { useAuth } from './context/AuthContext';
import {
  useGetMonthsQuery,
  useGetCategoriesQuery,
  useCreateExpenseMutation,
  useEndCurrentMonthMutation,
  useGetMySharedExpensesQuery,
} from '@repo/api-client';
import { MonthSummary, SharedExpense } from '@repo/shared-types';

export function App() {
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('landing');
  const [isShared, setIsShared] = useState(false);
  const [selectedSharedGroup, setSelectedSharedGroup] = useState<SharedExpense | null>(null);
  const [isSharedModalOpen, setIsSharedModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');
  const [isGlobalQuickAddOpen, setIsGlobalQuickAddOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('ledger_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  const [isMonthEndOpen, setIsMonthEndOpen] = useState(false);

  const handleOpenAuth = (mode: 'login' | 'signup' | 'upgrade') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const skipQueries = !user || !token || authLoading;

  // Query user's shared expenses
  const { data: mySharedGroups = [] } = useGetMySharedExpensesQuery(undefined, {
    skip: skipQueries,
  });

  // Handle switching to shared mode
  const handleToggleShared = (shared: boolean) => {
    setIsShared(shared);
    if (shared) {
      if (!selectedSharedGroup && mySharedGroups.length > 0) {
        setSelectedSharedGroup(mySharedGroups[0]);
      } else if (mySharedGroups.length === 0) {
        setIsSharedModalOpen(true);
      }
    }
  };

  const activeSharedId = isShared ? selectedSharedGroup?.id : undefined;

  const { data: months } = useGetMonthsQuery(
    {
      context: isShared ? 'shared' : 'personal',
      sharedExpenseId: activeSharedId,
    },
    {
      skip: skipQueries,
    },
  );
  const currentMonth = months?.find((m) => m.isCurrent) || months?.[0] || null;

  const { data: categories = [] } = useGetCategoriesQuery(undefined, {
    skip: skipQueries,
  });
  const [createExpense] = useCreateExpenseMutation();
  const [endCurrentMonthMutation] = useEndCurrentMonthMutation();

  // Global hotkey 'N' to trigger Quick Add modal anywhere in the app
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'n' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        if (currentMonth) {
          setIsGlobalQuickAddOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMonth]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('ledger_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('ledger_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleEndMonth = async (nextBudgetInPaisa: number, nextLabel?: string): Promise<MonthSummary> => {
    const summary = await endCurrentMonthMutation({
      budget: nextBudgetInPaisa,
      label: nextLabel,
    }).unwrap();
    return summary;
  };

  const handleCreateGlobalExpense = async (data: {
    monthId: string;
    categoryId?: string | null;
    content: string;
    amount: number;
    occurredAt: string;
  }) => {
    await createExpense(data).unwrap();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-text-secondary">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-display font-bold text-lg animate-pulse">
          L
        </div>
        <span className="text-xs font-medium tracking-wide">Initializing Ledger...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans transition-colors duration-160">
      {/* Top Bar */}
      <TopBar
        monthLabel={currentMonth?.label || (isShared ? 'Shared Ledger' : 'Ledger')}
        isShared={isShared}
        onToggleShared={handleToggleShared}
        activeGroupName={selectedSharedGroup?.name}
        onManageShared={() => setIsSharedModalOpen(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onEndMonthClick={() => setIsMonthEndOpen(true)}
        user={user}
        onOpenAuth={handleOpenAuth}
        onLogout={logout}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onQuickAdd={currentMonth ? () => setIsGlobalQuickAddOpen(true) : undefined}
          className="hidden md:flex"
        />

        {/* Main Content Area: Max-width 1240px with bottom padding for mobile bar */}
        <main className="flex-1 p-4 sm:p-7 max-w-[1240px] mx-auto w-full pb-24 md:pb-8">
          {!user ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-2xl mb-4 shadow-sm border border-primary/20">
                L
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2 font-display">Welcome to Ledger</h2>
              <p className="text-sm text-text-secondary max-w-sm mb-6">
                Sign in to your account, create a new one, or continue with a session to track your expenses and budgets.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleOpenAuth('login')}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-hover transition-colors shadow-sm"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleOpenAuth('signup')}
                  className="px-5 py-2.5 bg-card border border-border text-text-primary rounded-xl font-medium text-sm hover:bg-hover transition-colors shadow-sm"
                >
                  Create Account
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'landing' && (
                <LandingPage
                  context={isShared ? 'shared' : 'personal'}
                  sharedExpenseId={activeSharedId}
                />
              )}
              {activeTab === 'months' && (
                <MonthViewPage
                  context={isShared ? 'shared' : 'personal'}
                  sharedExpenseId={activeSharedId}
                />
              )}
              {activeTab === 'excel' && (
                <ExcelEditPage
                  context={isShared ? 'shared' : 'personal'}
                  sharedExpenseId={activeSharedId}
                  onBack={() => setActiveTab('landing')}
                />
              )}
              {activeTab === 'todo' && <TodoPage />}
              {activeTab === 'settings' && (
                <SettingsPage
                  isDark={isDark}
                  onToggleTheme={toggleTheme}
                  onOpenSharedModal={() => setIsSharedModalOpen(true)}
                  onOpenAuth={handleOpenAuth}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onQuickAdd={currentMonth ? () => setIsGlobalQuickAddOpen(true) : undefined}
      />

      {/* Global Quick Expense Modal */}
      {currentMonth && (
        <QuickExpenseModal
          isOpen={isGlobalQuickAddOpen}
          monthId={currentMonth.id}
          categories={categories}
          onClose={() => setIsGlobalQuickAddOpen(false)}
          onSubmit={handleCreateGlobalExpense}
        />
      )}

      {/* Month-End Rollover Modal */}
      <MonthEndModal
        isOpen={isMonthEndOpen}
        currentMonth={currentMonth}
        onClose={() => setIsMonthEndOpen(false)}
        onEndMonth={handleEndMonth}
      />

      {/* Shared Expense Group Manager Modal */}
      <SharedExpenseModal
        isOpen={isSharedModalOpen}
        selectedId={selectedSharedGroup?.id || null}
        onSelectSharedExpense={(group) => {
          setSelectedSharedGroup(group);
          setIsShared(true);
          setIsSharedModalOpen(false);
        }}
        onClose={() => setIsSharedModalOpen(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen || !user}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        canDismiss={Boolean(user)}
      />
    </div>
  );
}

export default App;
