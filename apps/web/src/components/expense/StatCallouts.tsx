import { useEffect, useState } from 'react';
import { MonthTotals } from '@repo/shared-types';
import { formatPaisa } from '../../utils/currency';
import { TrendingUp, ArrowUpRight, CheckCircle2, AlertCircle, Pencil } from 'lucide-react';

interface StatCalloutsProps {
  totals?: MonthTotals;
  onEditBudget?: () => void;
}

export const StatCallouts: React.FC<StatCalloutsProps> = ({ totals, onEditBudget }) => {
  const budget = totals?.budget ?? 0;
  const used = totals?.used ?? 0;
  const remaining = totals?.remaining ?? 0;
  const percentage = totals?.percentageUsed ?? 0;

  // Delight count-up animation on initial data load (Spec B.7)
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 500; // 500ms per spec

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* 1. Total Budget */}
      <div
        onClick={onEditBudget}
        className={`bg-surface rounded-card p-5 border border-border shadow-card flex flex-col justify-between relative group ${
          onEditBudget ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-text-secondary block">
              Total Budget
            </span>
            {onEditBudget && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditBudget();
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-md transition-colors cursor-pointer"
                title="Edit cycle budget (weekly, daily, or custom)"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}
          </div>
          <span className="font-display text-[36px] md:text-[42px] font-semibold text-text-primary mt-1.5 block tracking-tight">
            {formatPaisa(displayBudget)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="w-3 h-3" />
            </div>
            <span>Active billing cycle</span>
          </div>
          {onEditBudget && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditBudget();
              }}
              className="text-[11px] text-text-secondary hover:text-primary underline cursor-pointer"
            >
              Adjust amount
            </button>
          )}
        </div>
      </div>

      {/* 2. Spent So Far */}
      <div className="bg-surface rounded-card p-5 border border-border shadow-card flex flex-col justify-between">
        <div>
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-text-secondary block">
            Spent So Far
          </span>
          <span className="font-display text-[36px] md:text-[42px] font-semibold text-expense-alert mt-1.5 block tracking-tight">
            {formatPaisa(displayUsed)}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <div className="w-5 h-5 rounded-full bg-expense-alert/10 flex items-center justify-center text-expense-alert">
            <ArrowUpRight className="w-3 h-3" />
          </div>
          <span className="font-medium text-text-secondary">
            {percentage}% of total budget
          </span>
        </div>
      </div>

      {/* 3. Remaining */}
      <div className="bg-surface rounded-card p-5 border border-border shadow-card flex flex-col justify-between">
        <div>
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-text-secondary block">
            Remaining Budget
          </span>
          <span
            className={`font-display text-[36px] md:text-[42px] font-semibold mt-1.5 block tracking-tight ${
              isOverBudget
                ? 'text-expense-alert'
                : isWarning
                ? 'text-warning'
                : 'text-income-positive'
            }`}
          >
            {formatPaisa(displayRemaining)}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {isOverBudget ? (
            <>
              <div className="w-5 h-5 rounded-full bg-expense-alert/10 flex items-center justify-center text-expense-alert">
                <AlertCircle className="w-3 h-3" />
              </div>
              <span className="font-semibold text-expense-alert">Over budget</span>
            </>
          ) : isWarning ? (
            <>
              <div className="w-5 h-5 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                <AlertCircle className="w-3 h-3" />
              </div>
              <span className="font-semibold text-warning">Approaching limit (80%+)</span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full bg-income-positive/10 flex items-center justify-center text-income-positive">
                <CheckCircle2 className="w-3 h-3" />
              </div>
              <span className="font-medium text-text-secondary">On track</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
