import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatPaisa } from '../../utils/currency';
import { formatPktTime } from '../../utils/date';
import { ShoppingBag, Utensils, Car, Zap, Home, HeartPulse, Film, CircleDollarSign, Edit2, Trash2, } from 'lucide-react';
const getCategoryIcon = (categoryName) => {
    const name = categoryName?.toLowerCase() || '';
    if (name.includes('food'))
        return Utensils;
    if (name.includes('transport'))
        return Car;
    if (name.includes('util'))
        return Zap;
    if (name.includes('rent'))
        return Home;
    if (name.includes('shop'))
        return ShoppingBag;
    if (name.includes('health'))
        return HeartPulse;
    if (name.includes('entertain'))
        return Film;
    return CircleDollarSign;
};
export const LedgerRow = ({ expense, onEdit, onDelete, }) => {
    const CategoryIcon = getCategoryIcon(expense.category?.name);
    const categoryLabel = expense.category?.name || 'General';
    return (_jsxs("div", { className: "group h-11 border-b border-border flex items-center justify-between px-3 hover:bg-surface-raised/60 transition-colors duration-160", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0 flex-1 mr-4", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary", children: _jsx(CategoryIcon, { className: "w-4 h-4" }) }), _jsx("span", { className: "text-sm font-medium text-text-primary truncate", children: expense.content }), _jsx("span", { className: "hidden sm:inline-block px-2 py-0.5 rounded-pill text-[11px] font-medium bg-surface-raised text-text-secondary border border-border shrink-0", children: categoryLabel })] }), _jsxs("div", { className: "flex items-center gap-3 shrink-0", children: [_jsxs("div", { className: "text-right", children: [_jsx("span", { className: "font-medium text-sm text-text-primary tabular-nums tracking-tight block", children: formatPaisa(expense.amount) }), _jsx("span", { className: "text-[11px] text-text-secondary block", children: formatPktTime(expense.occurredAt) })] }), _jsxs("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-140", children: [_jsx("button", { type: "button", onClick: () => onEdit(expense), "aria-label": `Edit ${expense.content}`, className: "w-7 h-7 rounded-[6px] flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors", children: _jsx(Edit2, { className: "w-3.5 h-3.5" }) }), _jsx("button", { type: "button", onClick: () => onDelete(expense), "aria-label": `Delete ${expense.content}`, className: "w-7 h-7 rounded-[6px] flex items-center justify-center text-text-secondary hover:text-expense-alert hover:bg-expense-alert/10 transition-colors", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) })] })] })] }));
};
