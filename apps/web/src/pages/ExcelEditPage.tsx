import React, { useState, useRef, useEffect, FC } from 'react';
import {
  useGetMonthsQuery,
  useGetMonthByIdQuery,
  useGetCategoriesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  downloadMonthCsv,
} from '@repo/api-client';
import { Expense } from '@repo/shared-types';
import { formatPaisa, paisaToRupees, rupeesToPaisa } from '../utils/currency';
import { formatPktDateTime } from '../utils/date';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  Download,
  Plus,
  Trash2,
  Loader2,
  TableProperties,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';

interface ExcelEditPageProps {
  context?: 'personal' | 'shared';
  sharedExpenseId?: string;
  onBack?: () => void;
}

type ColumnField = 'occurredAt' | 'content' | 'categoryId' | 'amount';

export const ExcelEditPage: FC<ExcelEditPageProps> = ({
  context = 'personal',
  sharedExpenseId,
  onBack,
}) => {
  const { data: months, isLoading: monthsLoading } = useGetMonthsQuery({
    context,
    sharedExpenseId,
  });

  const [selectedMonthId, setSelectedMonthId] = useState<string>('');

  useEffect(() => {
    if (months && months.length > 0 && !selectedMonthId) {
      const active = months.find((m) => m.isCurrent) || months[0];
      setSelectedMonthId(active.id);
    }
  }, [months, selectedMonthId]);

  const { data: monthDetail, isLoading: detailLoading } = useGetMonthByIdQuery(
    selectedMonthId,
    { skip: !selectedMonthId },
  );

  const { data: categories = [] } = useGetCategoriesQuery();

  const [createExpense] = useCreateExpenseMutation();
  const [updateExpense] = useUpdateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  // Active cell coordinate: [rowIndex, colIndex]
  // Columns: 0: occurredAt, 1: content, 2: categoryId, 3: amount
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('');
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const expenses = monthDetail?.expenses || [];
  const currentMonth = months?.find((m) => m.id === selectedMonthId);

  const columns: ColumnField[] = ['occurredAt', 'content', 'categoryId', 'amount'];

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const startEditing = (row: number, col: number) => {
    const exp = expenses[row];
    if (!exp) return;

    setActiveCell({ row, col });
    setIsEditing(true);

    const field = columns[col];
    if (field === 'amount') {
      setEditValue(String(paisaToRupees(exp.amount)));
    } else if (field === 'occurredAt') {
      const d = new Date(exp.occurredAt);
      d.setMinutes(d.getMinutes() + 300); // PKT (+5:00)
      setEditValue(d.toISOString().slice(0, 16));
    } else if (field === 'categoryId') {
      setEditValue(exp.categoryId || '');
    } else {
      setEditValue(exp.content);
    }
  };

  const commitEdit = async () => {
    if (!activeCell) return;
    const exp = expenses[activeCell.row];
    if (!exp) return;

    const field = columns[activeCell.col];
    const updateData: any = {};

    if (field === 'content') {
      if (editValue.trim() && editValue !== exp.content) {
        updateData.content = editValue.trim();
      }
    } else if (field === 'amount') {
      const parsed = parseFloat(editValue);
      if (!isNaN(parsed) && parsed >= 0) {
        const paisa = rupeesToPaisa(parsed);
        if (paisa !== exp.amount) {
          updateData.amount = paisa;
        }
      }
    } else if (field === 'categoryId') {
      const newCat = editValue || null;
      if (newCat !== exp.categoryId) {
        updateData.categoryId = newCat;
      }
    } else if (field === 'occurredAt') {
      if (editValue) {
        const chosenWallClock = new Date(editValue);
        const utcInstant = new Date(chosenWallClock.getTime() - 5 * 60 * 60 * 1000);
        updateData.occurredAt = utcInstant.toISOString();
      }
    }

    if (Object.keys(updateData).length > 0 && selectedMonthId) {
      await updateExpense({ id: exp.id, data: updateData, monthId: selectedMonthId }).unwrap();
    }

    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  // Keyboard navigation across the ledger table
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!activeCell) return;

    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
        if (activeCell.row < expenses.length - 1) {
          setActiveCell({ row: activeCell.row + 1, col: activeCell.col });
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        if (e.shiftKey) {
          if (activeCell.col > 0) {
            setActiveCell({ row: activeCell.row, col: activeCell.col - 1 });
          } else if (activeCell.row > 0) {
            setActiveCell({ row: activeCell.row - 1, col: columns.length - 1 });
          }
        } else {
          if (activeCell.col < columns.length - 1) {
            setActiveCell({ row: activeCell.row, col: activeCell.col + 1 });
          } else if (activeCell.row < expenses.length - 1) {
            setActiveCell({ row: activeCell.row + 1, col: 0 });
          }
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (activeCell.row > 0) {
          setActiveCell({ row: activeCell.row - 1, col: activeCell.col });
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (activeCell.row < expenses.length - 1) {
          setActiveCell({ row: activeCell.row + 1, col: activeCell.col });
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (activeCell.col > 0) {
          setActiveCell({ row: activeCell.row, col: activeCell.col - 1 });
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (activeCell.col < columns.length - 1) {
          setActiveCell({ row: activeCell.row, col: activeCell.col + 1 });
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (activeCell.col > 0) {
            setActiveCell({ row: activeCell.row, col: activeCell.col - 1 });
          } else if (activeCell.row > 0) {
            setActiveCell({ row: activeCell.row - 1, col: columns.length - 1 });
          }
        } else {
          if (activeCell.col < columns.length - 1) {
            setActiveCell({ row: activeCell.row, col: activeCell.col + 1 });
          } else if (activeCell.row < expenses.length - 1) {
            setActiveCell({ row: activeCell.row + 1, col: 0 });
          }
        }
        break;
      case 'Enter':
        e.preventDefault();
        startEditing(activeCell.row, activeCell.col);
        break;
      case 'Delete':
      case 'Backspace':
        // If content cell, start editing cleared
        if (columns[activeCell.col] === 'content') {
          startEditing(activeCell.row, activeCell.col);
          setEditValue('');
        }
        break;
    }
  };

  const handleAddNewRow = async () => {
    if (!selectedMonthId) return;
    await createExpense({
      monthId: selectedMonthId,
      content: 'New Expense',
      amount: rupeesToPaisa(100),
      occurredAt: new Date().toISOString(),
      categoryId: categories[0]?.id || null,
    }).unwrap();

    // Focus on new row
    setTimeout(() => {
      setActiveCell({ row: expenses.length, col: 1 });
      startEditing(expenses.length, 1);
    }, 100);
  };

  if (monthsLoading || detailLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-text-secondary">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading ledger spreadsheet...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Top Header Bar: Spec B.9 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-card border border-border shadow-card">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-surface-raised text-text-secondary hover:text-text-primary transition-colors"
              title="Back to Active Cycle"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <TableProperties className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold text-text-primary tracking-tight">
                {currentMonth?.label || 'Excel Edit View'}
              </h2>
              {currentMonth?.isCurrent && (
                <span className="px-2 py-0.5 rounded-pill text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  Active Cycle
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              Inline cell editing • Arrow / Tab / Enter keyboard navigation
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Cycle Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedMonthId}
              onChange={(e) => {
                setSelectedMonthId(e.target.value);
                setActiveCell(null);
                setIsEditing(false);
              }}
              className="h-9 pl-3 pr-8 rounded-btn bg-surface-raised border border-border text-xs font-semibold text-text-primary appearance-none cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
            >
              {months?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} {m.isCurrent ? '• Active' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-text-secondary pointer-events-none" />
          </div>

          {/* Export CSV Button */}
          {selectedMonthId && (
            <button
              type="button"
              onClick={() => downloadMonthCsv(selectedMonthId)}
              className="h-9 px-3 bg-surface border border-border hover:bg-surface-raised rounded-btn text-xs font-semibold text-text-primary transition-colors flex items-center gap-1.5 shadow-sm"
              title="Stream CSV export file"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Export CSV</span>
            </button>
          )}

          {/* Add Row Button */}
          <button
            type="button"
            onClick={handleAddNewRow}
            className="h-9 px-3.5 bg-primary hover:bg-primary-hover text-white rounded-btn text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Chips */}
      {monthDetail?.totals && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface p-3.5 rounded-card border border-border flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Budget
            </span>
            <span className="font-display text-lg font-bold text-text-primary tabular-nums mt-0.5">
              {formatPaisa(monthDetail.totals.budget)}
            </span>
          </div>
          <div className="bg-surface p-3.5 rounded-card border border-border flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Spent
            </span>
            <span className="font-display text-lg font-bold text-expense-alert tabular-nums mt-0.5">
              {formatPaisa(monthDetail.totals.used)}
            </span>
          </div>
          <div className="bg-surface p-3.5 rounded-card border border-border flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Remaining
            </span>
            <span
              className={`font-display text-lg font-bold tabular-nums mt-0.5 ${
                monthDetail.totals.remaining < 0 ? 'text-expense-alert' : 'text-primary'
              }`}
            >
              {formatPaisa(monthDetail.totals.remaining)}
            </span>
          </div>
        </div>
      )}

      {/* Spreadsheet Ledger Table (Strict Hairline Rule, 44px rows) */}
      <div className="bg-surface rounded-card border border-border shadow-card overflow-x-auto focus:outline-none">
        <table className="w-full text-left border-collapse select-none">
          <thead>
            <tr className="h-10 bg-surface-raised border-b border-border text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              <th className="w-12 text-center px-2">#</th>
              <th className="w-48 px-3">Date / Time (PKT)</th>
              <th className="px-3">Description</th>
              <th className="w-44 px-3">Category</th>
              <th className="w-36 px-3 text-right">Amount (PKR)</th>
              <th className="w-16 text-center px-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-sm text-text-secondary">
                  No transactions recorded in this cycle. Click{' '}
                  <strong className="text-primary font-semibold">Add Row</strong> to create one.
                </td>
              </tr>
            ) : (
              expenses.map((exp, rowIndex) => {
                const isRowActive = activeCell?.row === rowIndex;

                return (
                  <tr
                    key={exp.id}
                    className="h-11 border-b border-border hover:bg-surface-raised/40 transition-colors group"
                  >
                    {/* Row Index */}
                    <td className="text-center text-xs text-text-secondary/70 font-mono">
                      {rowIndex + 1}
                    </td>

                    {/* Col 0: Date/Time */}
                    <td
                      onClick={() => {
                        setActiveCell({ row: rowIndex, col: 0 });
                        startEditing(rowIndex, 0);
                      }}
                      className={`px-3 text-xs text-text-secondary cursor-pointer relative ${
                        isRowActive && activeCell?.col === 0
                          ? 'shadow-[inset_0_0_0_2px_var(--primary)] bg-primary-soft'
                          : ''
                      }`}
                    >
                      {isRowActive && activeCell?.col === 0 && isEditing ? (
                        <input
                          ref={inputRef as any}
                          type="datetime-local"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          className="w-full h-8 px-1.5 text-xs bg-surface text-text-primary rounded border border-primary outline-none"
                        />
                      ) : (
                        <span>{formatPktDateTime(exp.occurredAt)}</span>
                      )}
                    </td>

                    {/* Col 1: Content */}
                    <td
                      onClick={() => {
                        setActiveCell({ row: rowIndex, col: 1 });
                        startEditing(rowIndex, 1);
                      }}
                      className={`px-3 text-sm font-medium text-text-primary cursor-pointer relative ${
                        isRowActive && activeCell?.col === 1
                          ? 'shadow-[inset_0_0_0_2px_var(--primary)] bg-primary-soft'
                          : ''
                      }`}
                    >
                      {isRowActive && activeCell?.col === 1 && isEditing ? (
                        <input
                          ref={inputRef as any}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          className="w-full h-8 px-2 text-sm bg-surface text-text-primary rounded border border-primary outline-none"
                        />
                      ) : (
                        <span>{exp.content}</span>
                      )}
                    </td>

                    {/* Col 2: Category */}
                    <td
                      onClick={() => {
                        setActiveCell({ row: rowIndex, col: 2 });
                        startEditing(rowIndex, 2);
                      }}
                      className={`px-3 text-xs text-text-secondary cursor-pointer relative ${
                        isRowActive && activeCell?.col === 2
                          ? 'shadow-[inset_0_0_0_2px_var(--primary)] bg-primary-soft'
                          : ''
                      }`}
                    >
                      {isRowActive && activeCell?.col === 2 && isEditing ? (
                        <select
                          ref={inputRef as any}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          className="w-full h-8 px-2 text-xs bg-surface text-text-primary rounded border border-primary outline-none"
                        >
                          <option value="">Uncategorized</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-pill bg-surface-raised text-[11px] font-medium text-text-secondary">
                          {exp.category?.name || 'Uncategorized'}
                        </span>
                      )}
                    </td>

                    {/* Col 3: Amount */}
                    <td
                      onClick={() => {
                        setActiveCell({ row: rowIndex, col: 3 });
                        startEditing(rowIndex, 3);
                      }}
                      className={`px-3 text-right text-sm font-semibold tabular-nums text-text-primary cursor-pointer relative ${
                        isRowActive && activeCell?.col === 3
                          ? 'shadow-[inset_0_0_0_2px_var(--primary)] bg-primary-soft'
                          : ''
                      }`}
                    >
                      {isRowActive && activeCell?.col === 3 && isEditing ? (
                        <input
                          ref={inputRef as any}
                          type="number"
                          step="any"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          className="w-full h-8 px-2 text-right text-sm font-semibold tabular-nums bg-surface text-text-primary rounded border border-primary outline-none"
                        />
                      ) : (
                        <span>{formatPaisa(exp.amount)}</span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="text-center px-2">
                      <button
                        type="button"
                        onClick={() => setDeletingExpense(exp)}
                        className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:text-expense-alert hover:bg-surface-raised transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete expense entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingExpense && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Transaction"
          description={`Are you sure you want to permanently delete "${deletingExpense.content}"?`}
          confirmLabel="Delete"
          onConfirm={async () => {
            if (selectedMonthId) {
              await deleteExpense({ id: deletingExpense.id, monthId: selectedMonthId });
            }
            setDeletingExpense(null);
          }}
          onCancel={() => setDeletingExpense(null)}
        />
      )}
    </div>
  );
};
