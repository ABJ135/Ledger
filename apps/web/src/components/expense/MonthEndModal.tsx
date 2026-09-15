import { useState, FC, FormEvent } from 'react';
import { Month, MonthSummary } from '@repo/shared-types';
import { formatPaisa, paisaToRupees, rupeesToPaisa } from '../../utils/currency';
import {
  CalendarCheck,
  X,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface MonthEndModalProps {
  isOpen: boolean;
  currentMonth: Month | null;
  onClose: () => void;
  onEndMonth: (nextBudgetInPaisa: number) => Promise<MonthSummary>;
}

export const MonthEndModal: FC<MonthEndModalProps> = ({
  isOpen,
  currentMonth,
  onClose,
  onEndMonth,
}) => {
  const [nextRupees, setNextRupees] = useState(() =>
    currentMonth ? paisaToRupees(currentMonth.budget).toString() : '100000',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<MonthSummary | null>(null);

  if (!isOpen || !currentMonth) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(nextRupees);
    if (isNaN(parsed) || parsed < 0) return;

    try {
      setIsSubmitting(true);
      const result = await onEndMonth(rupeesToPaisa(parsed));
      setSummary(result);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setSummary(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141311]/50 backdrop-blur-[2px] transition-opacity"
      onClick={handleFinish}
    >
      <div
        className="w-full max-w-[480px] bg-surface border border-border rounded-modal p-6 shadow-modal dark:shadow-modal-dark transform scale-100 transition-all max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-text-primary tracking-tight">
                {summary ? 'Cycle Closed Summary' : 'End Active Cycle'}
              </h3>
              <span className="text-xs text-text-secondary">
                {currentMonth.label}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: Stage 1 (Budget prompt) vs Stage 2 (Summary) */}
        {!summary ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <p className="text-sm text-text-secondary leading-relaxed">
              Ending this cycle will finalize its transactions, calculate your summary report, and immediately activate the next billing cycle with no gaps.
            </p>

            <div className="p-4 rounded-[12px] bg-surface-raised border border-border flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Current Cycle Baseline
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-text-primary">Allocated Budget:</span>
                <span className="font-display text-lg font-semibold text-text-primary tabular-nums">
                  {formatPaisa(currentMonth.budget)}
                </span>
              </div>
            </div>

            {/* Prompt for next month budget */}
            <div>
              <label className="text-[13px] font-semibold text-text-primary mb-1.5 block">
                Budget for Next Cycle (Rs)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={nextRupees}
                onChange={(e) => setNextRupees(e.target.value)}
                placeholder="Enter budget in PKR"
                className="w-full h-11 px-3.5 rounded-btn border border-border bg-surface text-text-primary text-base font-medium tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                required
              />
              <span className="text-xs text-text-secondary mt-1 block">
                Defaults to your current budget. You can customize this anytime later.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-btn border border-border bg-surface hover:bg-surface-raised text-text-primary text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 rounded-btn bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
              >
                <span>End & Rollover</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          /* Stage 2: Final Summary Report */
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 text-income-positive">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Cycle Closed Successfully
              </span>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-[12px] bg-surface-raised border border-border">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block">
                  Total Spent
                </span>
                <span className="font-display text-2xl font-semibold text-expense-alert mt-1 block tabular-nums">
                  {formatPaisa(summary.totalSpent)}
                </span>
              </div>

              <div className="p-3.5 rounded-[12px] bg-surface-raised border border-border">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block">
                  {summary.remaining >= 0 ? 'Saved / Remaining' : 'Over Budget'}
                </span>
                <span
                  className={`font-display text-2xl font-semibold mt-1 block tabular-nums ${
                    summary.remaining >= 0
                      ? 'text-income-positive'
                      : 'text-expense-alert'
                  }`}
                >
                  {formatPaisa(summary.remaining)}
                </span>
              </div>
            </div>

            {/* Category Breakdown */}
            {summary.categoryBreakdown.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Spending by Category
                </span>
                <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                  {summary.categoryBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-1 p-2 rounded-[8px] bg-surface-raised/60 border border-border/60"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-text-primary">
                          {item.categoryName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text-primary tabular-nums">
                            {formatPaisa(item.total)}
                          </span>
                          <span className="text-[11px] text-text-secondary">
                            ({item.percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notice for new active cycle */}
            <div className="p-3.5 rounded-[12px] bg-primary/5 border border-primary/20 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-primary block">
                  {summary.nextMonthLabel || 'Next Cycle'} is now active!
                </span>
                <span className="text-text-secondary">
                  All transactions from now will track under the new cycle.
                </span>
              </div>
            </div>

            {/* Finish Button */}
            <button
              type="button"
              onClick={handleFinish}
              className="w-full h-11 rounded-btn bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Continue to New Cycle</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
