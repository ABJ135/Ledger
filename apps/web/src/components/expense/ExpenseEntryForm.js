import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import { getPktNowForInput, pktInputToUtcIso } from '../../utils/date';
import { rupeesToPaisa } from '../../utils/currency';
export const ExpenseEntryForm = ({ monthId, categories, onSubmit, }) => {
    const [content, setContent] = useState('');
    const [rupees, setRupees] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [pktDateTime, setPktDateTime] = useState(getPktNowForInput());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        const trimmedContent = content.trim();
        const parsedRupees = parseFloat(rupees);
        if (!trimmedContent) {
            setError('Please enter an expense description');
            return;
        }
        if (isNaN(parsedRupees) || parsedRupees <= 0) {
            setError('Please enter a valid amount greater than 0');
            return;
        }
        try {
            setIsSubmitting(true);
            const amountInPaisa = rupeesToPaisa(parsedRupees);
            const occurredAtUtc = pktInputToUtcIso(pktDateTime);
            await onSubmit({
                monthId,
                categoryId: categoryId || null,
                content: trimmedContent,
                amount: amountInPaisa,
                occurredAt: occurredAtUtc,
            });
            // Reset fields
            setContent('');
            setRupees('');
            setPktDateTime(getPktNowForInput());
        }
        catch (err) {
            setError(err?.data?.message || err?.message || 'Failed to add expense');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "bg-surface rounded-card p-5 border border-border shadow-card flex flex-col gap-3", children: [_jsxs("div", { className: "flex flex-col md:flex-row items-stretch md:items-end gap-3", children: [_jsxs("div", { className: "w-full md:w-[175px] shrink-0", children: [_jsx("label", { className: "text-[13px] font-medium text-text-secondary mb-1 block", children: "Date & Time (PKT)" }), _jsx("input", { type: "datetime-local", value: pktDateTime, onChange: (e) => setPktDateTime(e.target.value), className: "w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors", required: true })] }), _jsxs("div", { className: "flex-1 min-w-[200px]", children: [_jsx("label", { className: "text-[13px] font-medium text-text-secondary mb-1 block", children: "Description" }), _jsx("input", { type: "text", placeholder: "e.g. Weekly grocery, Petrol, Internet bill", value: content, onChange: (e) => setContent(e.target.value), className: "w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors", required: true })] }), _jsxs("div", { className: "w-full md:w-[160px] shrink-0", children: [_jsx("label", { className: "text-[13px] font-medium text-text-secondary mb-1 block", children: "Category" }), _jsxs("div", { className: "relative", children: [_jsxs("select", { value: categoryId, onChange: (e) => setCategoryId(e.target.value), className: "w-full h-10 pl-8 pr-3 rounded-btn border border-border bg-surface text-text-primary text-sm appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer", children: [_jsx("option", { value: "", children: "General / Other" }), categories.map((cat) => (_jsx("option", { value: cat.id, children: cat.name }, cat.id)))] }), _jsx(Tag, { className: "w-4 h-4 text-text-secondary absolute left-2.5 top-3 pointer-events-none" })] })] }), _jsxs("div", { className: "w-full md:w-[130px] shrink-0", children: [_jsx("label", { className: "text-[13px] font-medium text-text-secondary mb-1 block", children: "Price (Rs)" }), _jsx("input", { type: "number", min: "1", step: "any", placeholder: "0", value: rupees, onChange: (e) => setRupees(e.target.value), className: "w-full h-10 px-3 rounded-btn border border-border bg-surface text-text-primary text-sm tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors", required: true })] }), _jsx("div", { className: "shrink-0", children: _jsxs("button", { type: "submit", disabled: isSubmitting, className: "w-full md:w-auto h-10 px-5 rounded-btn bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm focus-visible:outline-2 focus-visible:outline-primary", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "Add Expense" })] }) })] }), error && (_jsx("span", { className: "text-xs text-expense-alert font-medium mt-1", children: error }))] }));
};
