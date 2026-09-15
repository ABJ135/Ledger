import { Expense } from '@repo/shared-types';
import { formatPaisa } from '../../utils/currency';
import { formatPktTime } from '../../utils/date';
import {
  ShoppingBag,
  Utensils,
  Car,
  Zap,
  Home,
  HeartPulse,
  Film,
  CircleDollarSign,
  Edit2,
  Trash2,
} from 'lucide-react';

interface LedgerRowProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

const getCategoryIcon = (categoryName?: string) => {
  const name = categoryName?.toLowerCase() || '';
  if (name.includes('food')) return Utensils;
  if (name.includes('transport')) return Car;
  if (name.includes('util')) return Zap;
  if (name.includes('rent')) return Home;
  if (name.includes('shop')) return ShoppingBag;
  if (name.includes('health')) return HeartPulse;
  if (name.includes('entertain')) return Film;
  return CircleDollarSign;
};

export const LedgerRow: React.FC<LedgerRowProps> = ({
  expense,
  onEdit,
  onDelete,
}) => {
  const CategoryIcon = getCategoryIcon(expense.category?.name);
  const categoryLabel = expense.category?.name || 'General';

  return (
    <div className="group h-11 border-b border-border flex items-center justify-between px-3 hover:bg-surface-raised/60 transition-colors duration-160">
      {/* Left side: Icon-in-circle + Content + Category pill */}
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
        {/* 32px diameter icon-in-circle per Spec B.6 */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
          <CategoryIcon className="w-4 h-4" />
        </div>

        <span className="text-sm font-medium text-text-primary truncate">
          {expense.content}
        </span>

        <span className="hidden sm:inline-block px-2 py-0.5 rounded-pill text-[11px] font-medium bg-surface-raised text-text-secondary border border-border shrink-0">
          {categoryLabel}
        </span>
      </div>

      {/* Right side: Amount + Muted Time + Hover Action Buttons */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <span className="font-medium text-sm text-text-primary tabular-nums tracking-tight block">
            {formatPaisa(expense.amount)}
          </span>
          <span className="text-[11px] text-text-secondary block">
            {formatPktTime(expense.occurredAt)}
          </span>
        </div>

        {/* Hover-revealed edit and delete buttons per B.7 / B.8 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-140">
          <button
            type="button"
            onClick={() => onEdit(expense)}
            aria-label={`Edit ${expense.content}`}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(expense)}
            aria-label={`Delete ${expense.content}`}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-text-secondary hover:text-expense-alert hover:bg-expense-alert/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
