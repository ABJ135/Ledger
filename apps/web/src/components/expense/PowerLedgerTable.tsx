import { FC, useState, useMemo } from 'react';
import { Expense, Category } from '@repo/shared-types';
import { formatPaisa } from '../../utils/currency';
import { formatPktDateTime } from '../../utils/date';
import { getCategoryIcon } from '../dashboard/SpendingBreakdownChart';
import {
  Search,
  ArrowUpDown,
  Edit2,
  Trash2,
  Receipt,
  Download,
  X,
  Plus,
} from 'lucide-react';

interface PowerLedgerTableProps {
  expenses: Expense[];
  categories: Category[];
  selectedCategoryId?: string | null;
  onSelectCategory?: (categoryId: string | null) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  onOpenQuickAdd: () => void;
  onExportCsv?: () => void;
}

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export const PowerLedgerTable: FC<PowerLedgerTableProps> = ({
  expenses,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onEditExpense,
  onDeleteExpense,
  onOpenQuickAdd,
  onExportCsv,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');

  // Filter and sort transactions
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Filter by category
    if (selectedCategoryId) {
      result = result.filter((e) => e.categoryId === selectedCategoryId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((e) => {
        const descMatch = e.content.toLowerCase().includes(q);
        const catMatch = e.category?.name?.toLowerCase().includes(q);
        const amountMatch = (e.amount / 100).toString().includes(q);
        return descMatch || catMatch || amountMatch;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortOption === 'date-desc') {
        return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
      }
      if (sortOption === 'date-asc') {
        return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
      }
      if (sortOption === 'amount-desc') {
        return b.amount - a.amount;
      }
      if (sortOption === 'amount-asc') {
        return a.amount - b.amount;
      }
      return 0;
    });

    return result;
  }, [expenses, selectedCategoryId, searchQuery, sortOption]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Group by relative day (Today, Yesterday, Earlier)
  const groupedExpenses = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { title: string; items: Expense[] }[] = [];
    const todayItems: Expense[] = [];
    const yesterdayItems: Expense[] = [];
    const earlierItems: Expense[] = [];

    for (const exp of filteredExpenses) {
      const expDate = new Date(exp.occurredAt);
      expDate.setHours(0, 0, 0, 0);

      if (expDate.getTime() === today.getTime()) {
        todayItems.push(exp);
      } else if (expDate.getTime() === yesterday.getTime()) {
        yesterdayItems.push(exp);
      } else {
        earlierItems.push(exp);
      }
    }

    if (todayItems.length > 0) groups.push({ title: 'Today', items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ title: 'Yesterday', items: yesterdayItems });
    if (earlierItems.length > 0) groups.push({ title: 'Earlier in this cycle', items: earlierItems });

    return groups;
  }, [filteredExpenses]);

  return (
    <div className="bg-surface rounded-card border border-border shadow-card overflow-hidden flex flex-col">
      {/* Header & Controls Bar */}
      <div className="p-5 border-b border-border/70 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary tracking-tight">
                Ledger Transactions
              </h3>
              <p className="text-xs text-text-secondary">
                Showing {filteredExpenses.length} of {expenses.length} records • Total {formatPaisa(filteredTotal)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {onExportCsv && expenses.length > 0 && (
              <button
                type="button"
                onClick={onExportCsv}
                className="h-9 px-3 rounded-btn border border-border hover:bg-surface-raised text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Download CSV export"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenQuickAdd}
              className="h-9 px-3.5 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description, category, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-btn bg-surface-raised/60 border border-border text-xs text-text-primary focus:outline-hidden focus:border-primary focus:bg-surface transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-text-secondary" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="h-9 px-2.5 rounded-btn bg-surface-raised border border-border text-xs font-medium text-text-primary focus:outline-hidden focus:border-primary transition-colors cursor-pointer"
            >
              <option value="date-desc">Newest Date First</option>
              <option value="date-asc">Oldest Date First</option>
              <option value="amount-desc">Highest Amount (PKR)</option>
              <option value="amount-asc">Lowest Amount (PKR)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onSelectCategory?.(null)}
            className={`px-3 py-1 rounded-pill text-xs font-semibold transition-colors cursor-pointer ${
              !selectedCategoryId
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-raised hover:bg-surface border border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            All ({expenses.length})
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const count = expenses.filter((e) => e.categoryId === cat.id).length;
            if (count === 0 && !isSelected) return null;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory?.(isSelected ? null : cat.id)}
                className={`px-2.5 py-1 rounded-pill text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-raised hover:bg-surface border border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>{getCategoryIcon(cat.name)}</span>
                <span>{cat.name}</span>
                <span className="opacity-75 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaction List / Groups */}
      {filteredExpenses.length === 0 ? (
        <div className="py-14 px-6 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center text-text-secondary">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">No transactions found</h4>
            <p className="text-xs text-text-secondary mt-1">
              {searchQuery || selectedCategoryId
                ? 'Try clearing your search filters to see all cycle expenses.'
                : 'Your ledger is ready. Record your first payment above.'}
            </p>
          </div>
          {(searchQuery || selectedCategoryId) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                onSelectCategory?.(null);
              }}
              className="text-xs font-semibold text-primary hover:underline mt-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {groupedExpenses.map((group) => (
            <div key={group.title} className="flex flex-col">
              {/* Group Date Header */}
              <div className="px-5 py-2 bg-surface-raised/40 text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center justify-between border-y border-border/40">
                <span>{group.title}</span>
                <span className="font-medium lowercase text-text-secondary">
                  {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/40">
                {group.items.map((expense) => {
                  const catName = expense.category?.name || 'Uncategorized';

                  return (
                    <div
                      key={expense.id}
                      className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-raised/50 transition-colors group"
                    >
                      {/* Left: Icon & Description */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
                        <div className="w-8 h-8 rounded-full bg-surface-raised text-primary flex items-center justify-center shrink-0 border border-border">
                          {getCategoryIcon(catName)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text-primary truncate">
                              {expense.content}
                            </span>
                            <span className="px-2 py-0.5 rounded-pill text-[10px] font-semibold bg-surface-raised text-text-secondary border border-border shrink-0">
                              {catName}
                            </span>
                          </div>
                          <span className="text-[11px] text-text-secondary block mt-0.5">
                            {formatPktDateTime(expense.occurredAt)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Amount & Action buttons */}
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="font-display font-bold text-base text-text-primary tabular-nums">
                          {formatPaisa(expense.amount)}
                        </span>

                        {/* Hover Actions */}
                        <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => onEditExpense(expense)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
                            title="Edit transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteExpense(expense)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-expense-alert hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
