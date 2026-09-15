import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { paisaToRupees, rupeesToPaisa } from '../../utils/currency';
import { Edit2, X } from 'lucide-react';
export const EditExpenseModal = ({ isOpen, expense, categories, onClose, onSave, }) => {
    const [content, setContent] = useState('');
    const [rupees, setRupees] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    useEffect(() => {
        if (expense) {
            setContent(expense.content);
            setRupees(paisaToRupees(expense.amount).toString());
            setCategoryId(expense.categoryId || '');
        }
    }, [expense]);
    if (!isOpen || !expense)
        return null;
    const handleSubmit = async (e) => {
        e.preventDefault();
        const parsedRupees = parseFloat(rupees);
        if (!content.trim() || isNaN(parsedRupees) || parsedRupees <= 0)
            return;
        try {
            setIsSubmitting(true);
            await onSave({
                id: expense.id,
                content: content.trim(),
                amount: rupeesToPaisa(parsedRupees),
                categoryId: categoryId || null,
            });
            onClose();
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141311]/45 backdrop-blur-[2px]", onClick: onClose, children: _jsxs("div", { className: "w-full max-w-[420px] bg-surface border border-border rounded-modal p-6 shadow-modal dark:shadow-modal-dark", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between mb-5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary", children: _jsx(Edit2, { className: "w-4 h-4" }) }), _jsx("h3", { className: "text-lg font-semibold text-text-primary", children: "Edit Expense" })] }), _jsx("button", { type: "button", onClick: onClose, className: "w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-raised", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-[13px] font-medium text-text-secondary mb-1 block", children: "Description" }), _jsx("input", { type: "text", value: content, onChange: (e) => setContent(e.target.value), className: "w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[13px] font-medium text-text-secondary mb-1 block", children: "Category" }), _jsxs("select", { value: categoryId, onChange: (e) => setCategoryId(e.target.value), className: "w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer", children: [_jsx("option", { value: "", children: "General / Other" }), categories.map((cat) => (_jsx("option", { value: cat.id, children: cat.name }, cat.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[13px] font-medium text-text-secondary mb-1 block", children: "Amount (Rs)" }), _jsx("input", { type: "number", min: "1", step: "any", value: rupees, onChange: (e) => setRupees(e.target.value), className: "w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary", required: true })] }), _jsxs("div", { className: "flex items-center justify-end gap-3 mt-2", children: [_jsx("button", { type: "button", onClick: onClose, className: "h-10 px-4 rounded-btn border border-border bg-surface hover:bg-surface-raised text-text-primary text-sm font-semibold transition-colors", children: "Cancel" }), _jsx("button", { type: "submit", disabled: isSubmitting, className: "h-10 px-5 rounded-btn bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold transition-colors", children: "Save Changes" })] })] })] }) }));
};
