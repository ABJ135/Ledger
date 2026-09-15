import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { formatPaisa } from '../../utils/currency';
import { TrendingUp, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
export const StatCallouts = ({ totals }) => {
    const budget = totals?.budget ?? 0;
    const used = totals?.used ?? 0;
    const remaining = totals?.remaining ?? 0;
    const percentage = totals?.percentageUsed ?? 0;
    // Delight count-up animation on initial data load (Spec B.7)
    const [animatedProgress, setAnimatedProgress] = useState(0);
    useEffect(() => {
        let startTimestamp = null;
        const duration = 500; // 500ms per spec
        const step = (timestamp) => {
            if (!startTimestamp)
                startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setAnimatedProgress(eased);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }, [totals?.budget, totals?.used]);
    const displayBudget = Math.round(budget * animatedProgress);
    const displayUsed = Math.round(used * animatedProgress);
    const displayRemaining = Math.round(remaining * animatedProgress);
    const isOverBudget = remaining < 0;
    const isWarning = percentage >= 80 && !isOverBudget;
    return (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-5", children: [_jsxs("div", { className: "bg-surface rounded-card p-5 border border-border shadow-card flex flex-col justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[12px] font-semibold uppercase tracking-[0.06em] text-text-secondary block", children: "Total Budget" }), _jsx("span", { className: "font-display text-[36px] md:text-[42px] font-semibold text-text-primary mt-1.5 block tracking-tight", children: formatPaisa(displayBudget) })] }), _jsxs("div", { className: "mt-3 flex items-center gap-1.5 text-xs text-text-secondary", children: [_jsx("div", { className: "w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary", children: _jsx(TrendingUp, { className: "w-3 h-3" }) }), _jsx("span", { children: "Active billing cycle" })] })] }), _jsxs("div", { className: "bg-surface rounded-card p-5 border border-border shadow-card flex flex-col justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[12px] font-semibold uppercase tracking-[0.06em] text-text-secondary block", children: "Spent So Far" }), _jsx("span", { className: "font-display text-[36px] md:text-[42px] font-semibold text-expense-alert mt-1.5 block tracking-tight", children: formatPaisa(displayUsed) })] }), _jsxs("div", { className: "mt-3 flex items-center gap-1.5 text-xs", children: [_jsx("div", { className: "w-5 h-5 rounded-full bg-expense-alert/10 flex items-center justify-center text-expense-alert", children: _jsx(ArrowUpRight, { className: "w-3 h-3" }) }), _jsxs("span", { className: "font-medium text-text-secondary", children: [percentage, "% of total budget"] })] })] }), _jsxs("div", { className: "bg-surface rounded-card p-5 border border-border shadow-card flex flex-col justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[12px] font-semibold uppercase tracking-[0.06em] text-text-secondary block", children: "Remaining Budget" }), _jsx("span", { className: `font-display text-[36px] md:text-[42px] font-semibold mt-1.5 block tracking-tight ${isOverBudget
                                    ? 'text-expense-alert'
                                    : isWarning
                                        ? 'text-warning'
                                        : 'text-income-positive'}`, children: formatPaisa(displayRemaining) })] }), _jsx("div", { className: "mt-3 flex items-center gap-1.5 text-xs", children: isOverBudget ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-5 h-5 rounded-full bg-expense-alert/10 flex items-center justify-center text-expense-alert", children: _jsx(AlertCircle, { className: "w-3 h-3" }) }), _jsx("span", { className: "font-semibold text-expense-alert", children: "Over budget" })] })) : isWarning ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-5 h-5 rounded-full bg-warning/10 flex items-center justify-center text-warning", children: _jsx(AlertCircle, { className: "w-3 h-3" }) }), _jsx("span", { className: "font-semibold text-warning", children: "Approaching limit (80%+)" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-5 h-5 rounded-full bg-income-positive/10 flex items-center justify-center text-income-positive", children: _jsx(CheckCircle2, { className: "w-3 h-3" }) }), _jsx("span", { className: "font-medium text-text-secondary", children: "On track" })] })) })] })] }));
};
