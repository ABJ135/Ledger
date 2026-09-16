import { FC, useState, useEffect, useRef } from 'react';
import { Category } from '@repo/shared-types';
import { rupeesToPaisa } from '../../utils/currency';
import {
  X,
  Plus,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Loader2,
  Check,
} from 'lucide-react';
import { getCategoryIcon } from '../dashboard/SpendingBreakdownChart';

interface QuickExpenseModalProps {
  isOpen: boolean;
  monthId: string;
  categories: Category[];
  onClose: () => void;
  onSubmit: (data: {
    monthId: string;
    categoryId?: string | null;
    content: string;
    amount: number;
    occurredAt: string;
  }) => Promise<void>;
}

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

export const QuickExpenseModal: FC<QuickExpenseModalProps> = ({
  isOpen,
  monthId,
  categories,
  onClose,
  onSubmit,
}) => {
  const [content, setContent] = useState('');
  const [rupees, setRupees] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [occurredAt, setOccurredAt] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setContent('');
      setRupees('');
      setCategoryId(categories[0]?.id || '');
      setOccurredAt(new Date().toISOString().slice(0, 10));
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const handleQuickAmount = (amt: number) => {
    const current = parseFloat(rupees) || 0;
    setRupees((current + amt).toString());
  };

  const handleSubmit = async (e?: React.FormEvent, keepOpen = false) => {
    if (e) e.preventDefault();
    setError(null);

    const parsedRupees = parseFloat(rupees);
    if (!content.trim()) {
      setError('Please enter a description for the expense.');
      return;
    }

    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      setError('Please enter a valid amount greater than Rs 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        monthId,
        content: content.trim(),
        amount: rupeesToPaisa(parsedRupees),
        categoryId: categoryId || null,
        occurredAt: new Date(occurredAt).toISOString(),
      });

      if (keepOpen) {
        setContent('');
        setRupees('');
        inputRef.current?.focus();
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface rounded-modal border border-border shadow-modal w-full max-w-lg overflow-hidden flex flex-col relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-text-primary tracking-tight">
                Record New Expense
              </h3>
              <span className="text-xs text-text-secondary">
                Track payment in active cycle
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 flex flex-col gap-4.5">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-btn">
              {error}
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Description / Item</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              required
              placeholder="e.g. Grocery store run, Fuel, Dinner with team"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-10 px-3.5 rounded-btn bg-surface-raised border border-border text-sm text-text-primary focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {/* Amount (Rupees) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              <span>Amount (PKR)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-secondary">
                Rs
              </span>
              <input
                type="number"
                step="any"
                required
                min="1"
                placeholder="0"
                value={rupees}
                onChange={(e) => setRupees(e.target.value)}
                className="w-full h-11 pl-10 pr-3.5 rounded-btn bg-surface-raised border border-border text-lg font-bold font-display text-text-primary focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            {/* Quick amount increment pills */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[11px] text-text-secondary mr-1">Quick add:</span>
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAmount(amt)}
                  className="px-2.5 py-1 rounded-pill bg-surface-raised hover:bg-primary/10 hover:text-primary border border-border text-xs font-semibold text-text-secondary transition-colors cursor-pointer"
                >
                  +{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary" />
              <span>Category</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map((cat) => {
                const isSelected = categoryId === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`h-9 px-2.5 rounded-btn border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-surface hover:bg-surface-raised border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className={isSelected ? 'text-white' : 'text-primary'}>
                      {getCategoryIcon(cat.name)}
                    </span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Date Occurred</span>
            </label>
            <input
              type="date"
              required
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full h-10 px-3.5 rounded-btn bg-surface-raised border border-border text-xs text-text-primary focus:outline-hidden focus:border-primary transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-btn border border-border hover:bg-surface-raised text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(undefined, true)}
              className="h-10 px-4 rounded-btn bg-surface-raised hover:bg-surface border border-border text-xs font-semibold text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Save transaction and immediately enter another"
            >
              <span>Save & Add Another</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 rounded-btn bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Record Transaction</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
