import { useState, FC, FormEvent, useRef, useEffect, useMemo } from 'react';
import {
  useGetTodosQuery,
  useGetCategoriesQuery,
  useGetMonthsQuery,
  useGetMonthByIdQuery,
  useCreateTodoMutation,
  useUpdateTodoMutation,
  useDeleteTodoMutation,
  useDeleteAllTodosMutation,
  usePromoteTodoMutation,
  usePromoteAllTodosMutation,
} from '@repo/api-client';
import { Todo } from '@repo/shared-types';
import {
  Plus,
  ArrowUpRight,
  Trash2,
  X,
  Sparkles,
  Loader2,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { formatPaisa, paisaToRupees, rupeesToPaisa } from '../utils/currency';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { getCategoryIcon } from '../components/dashboard/SpendingBreakdownChart';

export const TodoPage: FC = () => {
  const { data: todos = [], isLoading, refetch } = useGetTodosQuery();
  const { data: categories = [] } = useGetCategoriesQuery();

  // Active month info for budget impact simulation
  const { data: months = [] } = useGetMonthsQuery({ context: 'personal' });
  const activeMonth = months.find((m) => m.isCurrent) || months[0] || null;
  const { data: activeMonthDetail } = useGetMonthByIdQuery(activeMonth?.id || '', {
    skip: !activeMonth?.id,
  });

  const [createTodo] = useCreateTodoMutation();
  const [updateTodo] = useUpdateTodoMutation();
  const [deleteTodo] = useDeleteTodoMutation();
  const [deleteAllTodos] = useDeleteAllTodosMutation();
  const [promoteTodo] = usePromoteTodoMutation();
  const [promoteAllTodos] = usePromoteAllTodosMutation();

  // Add Item modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newPriceRupees, setNewPriceRupees] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmPromoteAll, setConfirmPromoteAll] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceRupees, setEditPriceRupees] = useState('');

  useEffect(() => {
    if (isAddOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddOpen]);

  const handleAddSubmit = async (e: FormEvent, keepOpen = false) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const price = newPriceRupees.trim() ? rupeesToPaisa(parseFloat(newPriceRupees)) : null;

    try {
      await createTodo({
        content: newContent.trim(),
        price: !isNaN(price as number) && price !== null ? price : null,
        categoryId: newCategoryId || null,
      }).unwrap();

      setNewContent('');
      setNewPriceRupees('');
      setNewCategoryId('');

      if (!keepOpen) {
        setIsAddOpen(false);
      } else {
        inputRef.current?.focus();
      }
    } catch (err) {
      console.error('Failed to create todo:', err);
    }
  };

  const handlePriceBlur = async (todo: Todo) => {
    const parsed = parseFloat(editPriceRupees);
    if (!isNaN(parsed) && parsed >= 0) {
      await updateTodo({
        id: todo.id,
        data: { price: rupeesToPaisa(parsed) },
      }).unwrap();
    }
    setEditingId(null);
  };

  const handlePromoteSingle = async (todo: Todo) => {
    try {
      await promoteTodo(todo.id).unwrap();
      await refetch();
    } catch (err) {
      console.error('Promote failed:', err);
    }
  };

  const handlePromoteAll = async () => {
    try {
      await promoteAllTodos().unwrap();
      await refetch();
    } catch (err) {
      console.error('Promote all failed:', err);
    } finally {
      setConfirmPromoteAll(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllTodos().unwrap();
      await refetch();
    } catch (err) {
      console.error('Delete all failed:', err);
    } finally {
      setConfirmDeleteAll(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!todoToDelete) return;
    try {
      await deleteTodo(todoToDelete.id).unwrap();
    } catch (err) {
      console.error('Delete single failed:', err);
    } finally {
      setTodoToDelete(null);
    }
  };

  // Calculations for wishlist totals and budget impact
  const totalWishlistPaisa = useMemo(() => {
    return todos.reduce((sum, t) => sum + (t.price || 0), 0);
  }, [todos]);

  const remainingBudget = activeMonthDetail?.totals?.remaining ?? 0;
  const simulatedRemaining = remainingBudget - totalWishlistPaisa;

  // Filtered todos
  const filteredTodos = useMemo(() => {
    return todos.filter((t) => {
      if (selectedCatId && t.categoryId !== selectedCatId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const contentMatch = t.content.toLowerCase().includes(q);
        const catMatch = t.category?.name?.toLowerCase().includes(q);
        return contentMatch || catMatch;
      }
      return true;
    });
  }, [todos, selectedCatId, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-secondary">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading planned purchases...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* 1. Planned Purchases Hero Header */}
      <div className="bg-surface rounded-card p-6 border border-border shadow-card flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-text-primary tracking-tight">
                Planned Purchases & Wishlist
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Simulate potential expenses and their impact on your active cycle allowance before committing.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {todos.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmPromoteAll(true)}
                  className="h-9 px-3.5 rounded-btn bg-income-positive hover:bg-income-positive/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Commit All to Cycle</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmDeleteAll(true)}
                  className="h-9 px-3 rounded-btn border border-border hover:border-expense-alert/40 text-text-secondary hover:text-expense-alert hover:bg-expense-alert/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="h-9 px-4 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Planned Item</span>
            </button>
          </div>
        </div>

        {/* 2. Budget Impact Simulator Bar */}
        <div className="p-4 bg-surface-raised/40 rounded-btn border border-border/70 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block">
              Total Wishlist Value
            </span>
            <span className="font-display text-2xl font-bold text-text-primary mt-0.5 block">
              {formatPaisa(totalWishlistPaisa)}
            </span>
            <span className="text-[11px] text-text-secondary">
              Across {todos.length} planned {todos.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block">
              Current Available Budget
            </span>
            <span className="font-display text-2xl font-bold text-income-positive mt-0.5 block">
              {formatPaisa(remainingBudget)}
            </span>
            <span className="text-[11px] text-text-secondary">
              In active cycle ({activeMonth?.label || 'Current'})
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block">
              Simulated Remaining
            </span>
            <span
              className={`font-display text-2xl font-bold mt-0.5 block ${
                simulatedRemaining < 0 ? 'text-expense-alert' : 'text-primary'
              }`}
            >
              {formatPaisa(simulatedRemaining)}
            </span>
            <span className="text-[11px] text-text-secondary">
              {simulatedRemaining < 0
                ? '⚠️ Exceeds current cycle allowance'
                : '✓ Safe to purchase within budget'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-surface rounded-card p-4 border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter wishlist items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-8 rounded-btn bg-surface-raised border border-border text-xs text-text-primary focus:outline-hidden focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSelectedCatId(null)}
            className={`px-3 py-1 rounded-pill text-xs font-semibold transition-colors cursor-pointer ${
              !selectedCatId
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-raised hover:bg-surface border border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            All
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCatId === cat.id;
            const count = todos.filter((t) => t.categoryId === cat.id).length;
            if (count === 0 && !isSelected) return null;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCatId(isSelected ? null : cat.id)}
                className={`px-2.5 py-1 rounded-pill text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
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

      {/* 4. Planned Items List */}
      <div className="bg-surface rounded-card border border-border shadow-card overflow-hidden">
        {filteredTodos.length === 0 ? (
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-text-primary">No planned purchases found</h4>
              <p className="text-xs text-text-secondary mt-1 max-w-sm">
                {searchQuery || selectedCatId
                  ? 'Try resetting your search query or category filters.'
                  : 'Add items you intend to buy to test their impact on your finances before purchasing.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="h-9 px-4 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors mt-2 cursor-pointer"
            >
              Add Planned Item
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredTodos.map((todo) => {
              const hasPrice = todo.price !== null && todo.price !== undefined && todo.price > 0;
              const catName = todo.category?.name || 'Uncategorized';
              const isInlineEditing = editingId === todo.id;

              return (
                <div
                  key={todo.id}
                  className="px-5 py-4 flex items-center justify-between hover:bg-surface-raised/40 transition-colors group"
                >
                  {/* Left: Icon & Title */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-border">
                      {getCategoryIcon(catName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary truncate">
                          {todo.content}
                        </span>
                        {todo.category && (
                          <span className="px-2 py-0.5 rounded-pill text-[10px] font-semibold bg-surface-raised text-text-secondary border border-border shrink-0">
                            {catName}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-text-secondary block mt-0.5">
                        {hasPrice ? 'Estimated purchase allowance' : 'No price set — click price to estimate'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Price & Actions */}
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Inline price edit */}
                    {isInlineEditing ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-text-secondary font-semibold">Rs</span>
                        <input
                          type="number"
                          step="any"
                          autoFocus
                          value={editPriceRupees}
                          onChange={(e) => setEditPriceRupees(e.target.value)}
                          onBlur={() => handlePriceBlur(todo)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePriceBlur(todo);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-24 h-8 px-2 rounded-btn bg-surface border border-primary text-xs font-bold font-display text-text-primary focus:outline-hidden"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(todo.id);
                          setEditPriceRupees(todo.price ? paisaToRupees(todo.price).toString() : '');
                        }}
                        className="text-right group/price cursor-pointer"
                        title="Click to edit estimated price"
                      >
                        <span className="font-display font-bold text-base text-text-primary block group-hover/price:text-primary transition-colors">
                          {hasPrice ? formatPaisa(todo.price as number) : 'Set Price'}
                        </span>
                        {hasPrice && remainingBudget > 0 && (
                          <span className="text-[10px] text-text-secondary block">
                            {Math.round(((todo.price as number) / remainingBudget) * 100)}% of balance
                          </span>
                        )}
                      </button>
                    )}

                    {/* Commit button */}
                    <button
                      type="button"
                      onClick={() => handlePromoteSingle(todo)}
                      className="h-8 px-3 rounded-btn bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Charge to active cycle and convert into transaction"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Commit</span>
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => setTodoToDelete(todo)}
                      className="w-8 h-8 rounded-btn flex items-center justify-center text-text-secondary hover:text-expense-alert hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Remove from planned list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Planned Item Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface rounded-modal border border-border shadow-modal w-full max-w-md overflow-hidden flex flex-col relative">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Add Planned Purchase</h3>
                  <span className="text-[11px] text-text-secondary">Simulate before spending</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => handleAddSubmit(e, false)} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Item Description
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  required
                  placeholder="e.g. Ergonomic Office Chair, Winter Jacket"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full h-10 px-3 rounded-btn bg-surface-raised border border-border text-sm text-text-primary focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Estimated Price (PKR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-secondary">
                    Rs
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional (can be set later)"
                    value={newPriceRupees}
                    onChange={(e) => setNewPriceRupees(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-btn bg-surface-raised border border-border text-sm font-display text-text-primary focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Category
                </label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full h-10 px-3 rounded-btn bg-surface-raised border border-border text-xs text-text-primary focus:outline-hidden focus:border-primary cursor-pointer"
                >
                  <option value="">None / Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="h-9 px-3 rounded-btn border border-border text-xs font-semibold text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => handleAddSubmit(e, true)}
                  className="h-9 px-3 rounded-btn bg-surface-raised border border-border text-xs font-semibold text-text-primary hover:bg-surface"
                >
                  Save & Add Another
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-btn bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modals */}
      <ConfirmDialog
        isOpen={confirmPromoteAll}
        title="Commit All Planned Items"
        description={`Commit all ${todos.length} planned items (${formatPaisa(totalWishlistPaisa)}) to the active cycle? They will immediately convert into recorded expenses.`}
        confirmLabel="Commit All to Cycle"
        onConfirm={handlePromoteAll}
        onCancel={() => setConfirmPromoteAll(false)}
      />

      <ConfirmDialog
        isOpen={confirmDeleteAll}
        title="Clear Wishlist"
        description="Are you sure you want to remove all planned items from your wishlist? This cannot be undone."
        confirmLabel="Clear All"
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmDeleteAll(false)}
      />

      <ConfirmDialog
        isOpen={!!todoToDelete}
        title="Delete Planned Item"
        description={`Are you sure you want to remove "${todoToDelete?.content}"?`}
        confirmLabel="Delete"
        onConfirm={handleDeleteSingle}
        onCancel={() => setTodoToDelete(null)}
      />
    </div>
  );
};
