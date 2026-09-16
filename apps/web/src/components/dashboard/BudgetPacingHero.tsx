import { FC, useEffect, useState } from 'react';
import { MonthTotals, Month } from '@repo/shared-types';
import { formatPaisa } from '../../utils/currency';
import {
  AlertCircle,
  CheckCircle2,
  Calendar,
  Pencil,
  Plus,
  Flame,
} from 'lucide-react';

interface BudgetPacingHeroProps {
  currentMonth: Month | null;
  totals?: MonthTotals;
  onEditBudget: () => void;
  onOpenQuickAdd: () => void;
}

export const BudgetPacingHero: FC<BudgetPacingHeroProps> = ({
  currentMonth,
  totals,
  onEditBudget,
  onOpenQuickAdd,
}) => {
  const budget = totals?.budget ?? (currentMonth?.budget || 0);
  const used = totals?.used ?? 0;
  const remaining = totals?.remaining ?? (budget - used);
  const percentage = totals?.percentageUsed ?? (budget > 0 ? Math.round((used / budget) * 100) : 0);

  // Smooth ease-out counter for numbers
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 600;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedProgress(eased);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [budget, used]);

  // Calculate cycle days pacing
  const now = new Date();
  const startDate = currentMonth ? new Date(currentMonth.startAt) : now;
  // If no end date yet, standard monthly cycle estimation of 30 days
  const cycleDays = 30;
  const elapsedDays = Math.max(
    1,
    Math.min(cycleDays, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  );
  const remainingDays = Math.max(1, cycleDays - elapsedDays);

  const dailyAllowance = Math.max(0, Math.round(remaining / remainingDays));
  const actualDailyBurn = Math.round(used / elapsedDays);

  const isOverBudget = remaining < 0;
  const expectedSpendPercentage = Math.round((elapsedDays / cycleDays) * 100);
  const isPacingAhead = percentage > expectedSpendPercentage + 10 && !isOverBudget;
  const isWarning = percentage >= 85 && !isOverBudget;

  const displayRemaining = Math.round(remaining * animatedProgress);
  const displayBudget = Math.round(budget * animatedProgress);
  const displayUsed = Math.round(used * animatedProgress);

  // Circular gauge values (radius 52, perimeter 2 * PI * 52 ≈ 326.7)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  let gaugeColor = '#10B981'; // emerald
  if (isOverBudget) {
    gaugeColor = '#EF4444'; // rose
  } else if (isPacingAhead || isWarning) {
    gaugeColor = '#F59E0B'; // amber
  }

  return (
    <div className="bg-surface rounded-card border border-border p-6 shadow-card relative overflow-hidden transition-all duration-200">
      {/* Subtle background ambient glow */}
      <div
        className="absolute -right-16 -top-16 w-64 h-64 rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{
          backgroundColor: isOverBudget ? '#EF4444' : '#0B4F4A',
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
        {/* Left Column: Key Stats & Pacing Analysis (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          {/* Top Status & Date Pill */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold bg-surface-raised border border-border text-text-secondary">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Day {elapsedDays} of {cycleDays}</span>
              <span className="opacity-40">•</span>
              <span>{remainingDays} days left</span>
            </div>

            {isOverBudget ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Over Budget by {formatPaisa(Math.abs(remaining))}</span>
              </div>
            ) : isPacingAhead ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Pacing Ahead of Schedule</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>On Track to Finish Under Budget</span>
              </div>
            )}
          </div>

          {/* Large Hero Metric: Remaining Allowance */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {isOverBudget ? 'Deficit' : 'Remaining Spendable Allowance'}
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span
                className={`font-display text-[44px] md:text-[52px] font-bold tracking-tight leading-none ${
                  isOverBudget
                    ? 'text-expense-alert'
                    : isWarning
                      ? 'text-warning'
                      : 'text-income-positive'
                }`}
              >
                {formatPaisa(displayRemaining)}
              </span>
              <span className="text-sm font-medium text-text-secondary">
                of {formatPaisa(displayBudget)} allowance
              </span>
            </div>
          </div>

          {/* Sub-metrics Grid (Daily Burn vs Target) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/70">
            <div className="p-3 bg-surface-raised/50 rounded-btn border border-border/60">
              <span className="text-[11px] font-medium text-text-secondary block">
                Spent So Far
              </span>
              <span className="text-base font-bold text-text-primary font-display mt-0.5 block">
                {formatPaisa(displayUsed)}
              </span>
              <span className="text-[10px] text-text-secondary mt-0.5 block">
                {percentage}% of total allowance
              </span>
            </div>

            <div className="p-3 bg-surface-raised/50 rounded-btn border border-border/60">
              <span className="text-[11px] font-medium text-text-secondary block">
                Safe Daily Limit
              </span>
              <span className="text-base font-bold text-income-positive font-display mt-0.5 block">
                {formatPaisa(dailyAllowance)}
                <span className="text-xs font-normal text-text-secondary"> / day</span>
              </span>
              <span className="text-[10px] text-text-secondary mt-0.5 block">
                For remaining {remainingDays} days
              </span>
            </div>

            <div className="p-3 bg-surface-raised/50 rounded-btn border border-border/60 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-medium text-text-secondary block">
                Current Burn Rate
              </span>
              <span className="text-base font-bold text-text-primary font-display mt-0.5 block">
                {formatPaisa(actualDailyBurn)}
                <span className="text-xs font-normal text-text-secondary"> / day</span>
              </span>
              <span className="text-[10px] text-text-secondary mt-0.5 block">
                Across past {elapsedDays} days
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Circular Gauge & Quick CTA (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-surface-raised/30 rounded-card border border-border/60 gap-4">
          <div className="relative flex items-center justify-center">
            <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 128 128">
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-border"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke={gaugeColor}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-display text-2xl font-bold text-text-primary tracking-tight">
                {percentage}%
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                consumed
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 w-full">
            <button
              type="button"
              onClick={onOpenQuickAdd}
              className="flex-1 h-10 px-4 bg-primary hover:bg-primary-hover text-white rounded-btn text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
            <button
              type="button"
              onClick={onEditBudget}
              className="h-10 px-3 bg-surface hover:bg-surface-raised border border-border text-text-secondary hover:text-text-primary rounded-btn text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Change budget allowance or cycle name"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Adjust</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
