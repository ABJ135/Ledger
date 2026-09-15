import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { MonthViewPage } from './pages/MonthViewPage';
import { TodoPage } from './pages/TodoPage';
import { ExcelEditPage } from './pages/ExcelEditPage';
import { SettingsPage } from './pages/SettingsPage';
import { MonthEndModal } from './components/expense/MonthEndModal';
import { SharedExpenseModal } from './components/shared/SharedExpenseModal';
import { useGetMonthsQuery, useEndCurrentMonthMutation, useGetMySharedExpensesQuery, } from '@repo/api-client';
export function App() {
    const [activeTab, setActiveTab] = useState('landing');
    const [isShared, setIsShared] = useState(false);
    const [selectedSharedGroup, setSelectedSharedGroup] = useState(null);
    const [isSharedModalOpen, setIsSharedModalOpen] = useState(false);
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('ledger_theme');
        if (saved)
            return saved === 'dark';
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    });
    const [isMonthEndOpen, setIsMonthEndOpen] = useState(false);
    // Query user's shared expenses
    const { data: mySharedGroups = [] } = useGetMySharedExpensesQuery();
    // Handle switching to shared mode
    const handleToggleShared = (shared) => {
        setIsShared(shared);
        if (shared) {
            if (!selectedSharedGroup && mySharedGroups.length > 0) {
                setSelectedSharedGroup(mySharedGroups[0]);
            }
            else if (mySharedGroups.length === 0) {
                setIsSharedModalOpen(true);
            }
        }
    };
    const activeSharedId = isShared ? selectedSharedGroup?.id : undefined;
    const { data: months } = useGetMonthsQuery({
        context: isShared ? 'shared' : 'personal',
        sharedExpenseId: activeSharedId,
    });
    const currentMonth = months?.find((m) => m.isCurrent) || months?.[0] || null;
    const [endCurrentMonthMutation] = useEndCurrentMonthMutation();
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('ledger_theme', 'dark');
        }
        else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('ledger_theme', 'light');
        }
    }, [isDark]);
    const toggleTheme = () => {
        setIsDark(!isDark);
    };
    const handleEndMonth = async (nextBudgetInPaisa) => {
        const summary = await endCurrentMonthMutation({
            budget: nextBudgetInPaisa,
        }).unwrap();
        return summary;
    };
    return (_jsxs("div", { className: "min-h-screen bg-background text-text-primary flex flex-col font-sans transition-colors duration-160", children: [_jsx(TopBar, { monthLabel: currentMonth?.label || (isShared ? 'Shared Ledger' : 'Ledger'), isShared: isShared, onToggleShared: handleToggleShared, activeGroupName: selectedSharedGroup?.name, onManageShared: () => setIsSharedModalOpen(true), isDark: isDark, onToggleTheme: toggleTheme, onEndMonthClick: () => setIsMonthEndOpen(true) }), _jsxs("div", { className: "flex-1 flex w-full", children: [_jsx(Sidebar, { activeTab: activeTab, onTabChange: setActiveTab, className: "hidden md:flex" }), _jsxs("main", { className: "flex-1 p-4 sm:p-7 max-w-[1240px] mx-auto w-full", children: [activeTab === 'landing' && (_jsx(LandingPage, { context: isShared ? 'shared' : 'personal', sharedExpenseId: activeSharedId })), activeTab === 'months' && (_jsx(MonthViewPage, { context: isShared ? 'shared' : 'personal', sharedExpenseId: activeSharedId })), activeTab === 'excel' && (_jsx(ExcelEditPage, { context: isShared ? 'shared' : 'personal', sharedExpenseId: activeSharedId, onBack: () => setActiveTab('landing') })), activeTab === 'todo' && _jsx(TodoPage, {}), activeTab === 'settings' && (_jsx(SettingsPage, { isDark: isDark, onToggleTheme: toggleTheme, onOpenSharedModal: () => setIsSharedModalOpen(true) }))] })] }), _jsx(MonthEndModal, { isOpen: isMonthEndOpen, currentMonth: currentMonth, onClose: () => setIsMonthEndOpen(false), onEndMonth: handleEndMonth }), _jsx(SharedExpenseModal, { isOpen: isSharedModalOpen, selectedId: selectedSharedGroup?.id || null, onSelectSharedExpense: (group) => {
                    setSelectedSharedGroup(group);
                    setIsShared(true);
                    setIsSharedModalOpen(false);
                }, onClose: () => setIsSharedModalOpen(false) })] }));
}
export default App;
