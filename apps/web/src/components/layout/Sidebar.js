import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Receipt, CalendarRange, TableProperties, CheckSquare, Settings, } from 'lucide-react';
export const Sidebar = ({ activeTab, onTabChange, className = '', }) => {
    const navItems = [
        { id: 'landing', label: 'Active Cycle', icon: Receipt },
        { id: 'months', label: 'Month View', icon: CalendarRange },
        { id: 'excel', label: 'Excel Edit', icon: TableProperties },
        { id: 'todo', label: 'To-Do List', icon: CheckSquare },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];
    return (_jsxs("aside", { className: `w-[272px] shrink-0 min-h-[calc(100vh-61px)] bg-surface border-r border-border p-4 flex flex-col justify-between ${className}`, children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wider text-text-secondary px-3 mb-1", children: "Navigation" }), navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (_jsxs("button", { type: "button", onClick: () => onTabChange(item.id), className: `w-full h-11 px-3 rounded-[12px] flex items-center gap-3 transition-colors duration-160 text-left focus-visible:outline-2 focus-visible:outline-primary ${isActive
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised font-medium'}`, children: [_jsx("div", { className: `w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-primary/15 text-primary' : 'bg-border/40 text-text-secondary'}`, children: _jsx(Icon, { className: "w-4 h-4" }) }), _jsx("span", { className: "text-sm", children: item.label })] }, item.id));
                    })] }), _jsx("div", { className: "px-3 py-2 border-t border-border/60", children: _jsx("span", { className: "text-[11px] text-text-secondary block", children: "Ledger v0.1 \u2022 Pakistan (PKT)" }) })] }));
};
