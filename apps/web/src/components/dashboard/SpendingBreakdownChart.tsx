import { FC, useMemo } from 'react';
import { Expense, Category } from '@repo/shared-types';
import { formatPaisa } from '../../utils/currency';
import {
  Utensils,
  Car,
  Home,
  Zap,
  ShoppingBag,
  Activity,
  Film,
  Tag,
  PieChart,
  Filter,
} from 'lucide-react';

interface SpendingBreakdownChartProps {
  expenses: Expense[];
  categories: Category[];
  selectedCategoryId?: string | null;
  onSelectCategory?: (categoryId: string | null) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#F59E0B',
  Groceries: '#F59E0B',
  Dining: '#F97316',
  Transport: '#06B6D4',
  Travel: '#0284C7',
  Housing: '#6366F1',
  Rent: '#4F46E5',
  Utilities: '#10B981',
  Bills: '#059669',
  Shopping: '#EC4899',
  Personal: '#D946EF',
  Entertainment: '#8B5CF6',
  Health: '#EF4444',
  Medical: '#DC2626',
  Other: '#64748B',
};

const DEFAULT_COLOR_PALETTE = [
  '#0B4F4A',
  '#F59E0B',
  '#6366F1',
  '#06B6D4',
  '#10B981',
  '#EC4899',
  '#8B5CF6',
  '#64748B',
];

export const getCategoryIcon = (categoryName?: string | null) => {
  const name = categoryName?.toLowerCase() || '';
  if (name.includes('food') || name.includes('dine') || name.includes('eat') || name.includes('grocer'))
    return <Utensils className="w-3.5 h-3.5" />;
  if (name.includes('transit') || name.includes('transport') || name.includes('car') || name.includes('fuel'))
    return <Car className="w-3.5 h-3.5" />;
  if (name.includes('house') || name.includes('rent') || name.includes('home'))
    return <Home className="w-3.5 h-3.5" />;
  if (name.includes('util') || name.includes('bill') || name.includes('electric') || name.includes('wifi'))
    return <Zap className="w-3.5 h-3.5" />;
  if (name.includes('shop') || name.includes('cloth') || name.includes('store'))
    return <ShoppingBag className="w-3.5 h-3.5" />;
  if (name.includes('health') || name.includes('med') || name.includes('doctor'))
    return <Activity className="w-3.5 h-3.5" />;
  if (name.includes('entertain') || name.includes('movie') || name.includes('game'))
    return <Film className="w-3.5 h-3.5" />;
  return <Tag className="w-3.5 h-3.5" />;
};

export const SpendingBreakdownChart: FC<SpendingBreakdownChartProps> = ({
  expenses,
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  // Aggregate expenses by category
  const breakdown = useMemo(() => {
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const catMap = new Map<string, { id: string | null; name: string; amount: number; count: number }>();

    for (const exp of expenses) {
      const catId = exp.categoryId || null;
      const key = catId || 'uncategorized';
      const catName = exp.category?.name || (categories.find((c) => c.id === catId)?.name) || 'Uncategorized';

      const existing = catMap.get(key) || {
        id: catId,
        name: catName,
        amount: 0,
        count: 0,
      };

      existing.amount += exp.amount;
      existing.count += 1;
      catMap.set(key, existing);
    }

    const items = Array.from(catMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map((item, idx) => {
        const percentage = totalSpent > 0 ? (item.amount / totalSpent) * 100 : 0;
        const color =
          CATEGORY_COLORS[item.name] ||
          DEFAULT_COLOR_PALETTE[idx % DEFAULT_COLOR_PALETTE.length] ||
          '#64748B';
        return {
          ...item,
          percentage,
          color,
        };
      });

    return { totalSpent, items };
  }, [expenses, categories]);

  // Compute SVG Donut segments
  const donutSegments = useMemo(() => {
    const segments: {
      id: string | null;
      color: string;
      dasharray: string;
      dashoffset: number;
    }[] = [];

    const circumference = 2 * Math.PI * 40; // r = 40 => circumference ≈ 251.32
    let cumulativePercentage = 0;

    for (const item of breakdown.items) {
      const strokeLength = (item.percentage / 100) * circumference;
      const dasharray = `${strokeLength} ${circumference - strokeLength}`;
      const dashoffset = -((cumulativePercentage / 100) * circumference);

      segments.push({
        id: item.id,
        color: item.color,
        dasharray,
        dashoffset,
      });

      cumulativePercentage += item.percentage;
    }

    return segments;
  }, [breakdown]);

  if (expenses.length === 0) {
    return (
      <div className="bg-surface rounded-card border border-border p-6 shadow-card flex flex-col items-center justify-center text-center py-10 gap-3">
        <div className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center text-text-secondary">
          <PieChart className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">No spending records yet</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-xs">
            Add transactions to see visual category breakdowns and spend distribution.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-card border border-border p-6 shadow-card flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/70 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary tracking-tight">
              Spending by Category
            </h3>
            <span className="text-[11px] text-text-secondary">
              {breakdown.items.length} active spending categories
            </span>
          </div>
        </div>

        {selectedCategoryId !== undefined && selectedCategoryId !== null && (
          <button
            type="button"
            onClick={() => onSelectCategory?.(null)}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Filter className="w-3 h-3" />
            <span>Clear filter</span>
          </button>
        )}
      </div>

      {/* Main Breakdown Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Donut Chart Graphic (4 cols) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center relative">
          <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="40"
              className="stroke-border/40"
              strokeWidth="12"
              fill="transparent"
            />
            {/* Slices */}
            {donutSegments.map((segment, idx) => (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r="40"
                stroke={segment.color}
                strokeWidth={selectedCategoryId === segment.id ? '15' : '12'}
                strokeDasharray={segment.dasharray}
                strokeDashoffset={segment.dashoffset}
                fill="transparent"
                className="transition-all duration-300 cursor-pointer hover:opacity-80"
                onClick={() => onSelectCategory?.(segment.id)}
              />
            ))}
          </svg>

          {/* Center Info */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[11px] font-semibold text-text-secondary uppercase">
              Total Spent
            </span>
            <span className="text-base font-bold text-text-primary font-display mt-0.5">
              {formatPaisa(breakdown.totalSpent)}
            </span>
          </div>
        </div>

        {/* Right: Ranked Categories List with progress bars (8 cols) */}
        <div className="md:col-span-8 flex flex-col gap-3">
          {breakdown.items.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;

            return (
              <div
                key={cat.id || 'uncat'}
                onClick={() => onSelectCategory?.(isSelected ? null : cat.id)}
                className={`p-2.5 rounded-btn border transition-all cursor-pointer flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-primary/5 border-primary shadow-xs'
                    : 'bg-surface hover:bg-surface-raised/60 border-border/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat.color }}
                    >
                      {getCategoryIcon(cat.name)}
                    </div>
                    <span className="text-xs font-semibold text-text-primary">
                      {cat.name}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      ({cat.count} {cat.count === 1 ? 'txn' : 'txns'})
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-text-primary font-display">
                      {formatPaisa(cat.amount)}
                    </span>
                    <span className="text-[11px] font-semibold text-text-secondary w-9 text-right">
                      {cat.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-surface-raised rounded-pill overflow-hidden">
                  <div
                    className="h-full rounded-pill transition-all duration-500"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
