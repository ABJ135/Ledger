import React, { FC, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  RefreshControl,
} from 'react-native';
import { Expense, SharedExpense } from '@repo/shared-types';
import {
  useGetMonthsQuery,
  useGetMonthByIdQuery,
  useGetCategoriesQuery,
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useEndCurrentMonthMutation,
  useUpdateMonthMutation,
  useGetMySharedExpensesQuery,
} from '@repo/api-client';
import { CalendarCheck, ShieldCheck, Users, Pencil, DollarSign, X } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { formatPaisa, paisaToRupees, rupeesToPaisa } from '../utils/currency';
import { StatCallout } from '../components/common/StatCallout';
import { LedgerRow } from '../components/expense/LedgerRow';
import { QuickExpenseForm } from '../components/expense/QuickExpenseForm';
import { MonthEndModal } from '../components/expense/MonthEndModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { SharedExpenseModal } from '../components/shared/SharedExpenseModal';

interface LandingScreenProps {
  onOpenCycles: () => void;
}

export const LandingScreen: FC<LandingScreenProps> = ({ onOpenCycles }) => {
  const [isShared, setIsShared] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SharedExpense | null>(null);
  const [isSharedModalOpen, setIsSharedModalOpen] = useState(false);

  const { data: myGroups = [] } = useGetMySharedExpensesQuery();

  const activeSharedId = isShared ? selectedGroup?.id : undefined;

  const {
    data: months,
    isLoading: monthsLoading,
    refetch: refetchMonths,
  } = useGetMonthsQuery({
    context: isShared ? 'shared' : 'personal',
    sharedExpenseId: activeSharedId,
  });

  const activeMonth = months?.find((m) => m.isCurrent) || months?.[0] || null;

  const {
    data: monthDetail,
    isLoading: detailLoading,
    refetch: refetchDetail,
  } = useGetMonthByIdQuery(activeMonth?.id || '', {
    skip: !activeMonth?.id,
  });

  const { data: categories = [] } = useGetCategoriesQuery();
  const [createExpense] = useCreateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();
  const [endCurrentMonth] = useEndCurrentMonthMutation();
  const [updateMonth] = useUpdateMonthMutation();

  const [isMonthEndOpen, setIsMonthEndOpen] = useState(false);
  const [isEditCycleOpen, setIsEditCycleOpen] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const [editBudgetPkr, setEditBudgetPkr] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleToggleMode = () => {
    if (!isShared) {
      if (!selectedGroup && myGroups.length > 0) {
        setSelectedGroup(myGroups[0]);
        setIsShared(true);
      } else {
        setIsSharedModalOpen(true);
      }
    } else {
      setIsShared(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMonths(), refetchDetail()]);
    setRefreshing(false);
  };

  const handleCreateExpense = async (data: {
    content: string;
    amount: number;
    categoryId?: string;
    occurredAt: string;
  }) => {
    if (!activeMonth) return;
    await createExpense({
      monthId: activeMonth.id,
      content: data.content,
      amount: data.amount,
      categoryId: data.categoryId,
      occurredAt: data.occurredAt,
    }).unwrap();
  };

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete || !activeMonth) return;
    try {
      await deleteExpense({ id: expenseToDelete.id, monthId: activeMonth.id }).unwrap();
    } catch (err) {
      console.error('Delete expense failed:', err);
    } finally {
      setExpenseToDelete(null);
    }
  };

  const handleEndMonth = async (nextBudgetInPaisa: number, nextLabel?: string) => {
    const res = await endCurrentMonth({ budget: nextBudgetInPaisa, label: nextLabel }).unwrap();
    await refetchMonths();
    return res;
  };

  const handleOpenEditCycle = () => {
    if (!activeMonth) return;
    setEditLabel(activeMonth.label || '');
    setEditBudgetPkr(String(paisaToRupees(activeMonth.budget)));
    setIsEditCycleOpen(true);
  };

  const handleSaveEditCycle = async () => {
    if (!activeMonth) return;
    const pkrNum = parseFloat(editBudgetPkr);
    if (isNaN(pkrNum) || pkrNum < 0) return;
    try {
      setEditSubmitting(true);
      await updateMonth({
        id: activeMonth.id,
        data: {
          label: editLabel.trim() || activeMonth.label,
          budget: rupeesToPaisa(pkrNum),
        },
      }).unwrap();
      await refetchMonths();
      setIsEditCycleOpen(false);
    } catch (err) {
      console.error('Failed to update cycle:', err);
    } finally {
      setEditSubmitting(false);
    }
  };

  if (monthsLoading || (activeMonth && detailLoading && !monthDetail)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading ledger...</Text>
      </View>
    );
  }

  const totals = monthDetail?.totals;
  const budget = totals?.budget ?? (activeMonth?.budget || 0);
  const used = totals?.used ?? 0;
  const remaining = totals?.remaining ?? (budget - used);
  const percentageUsed = totals?.percentageUsed ?? (budget > 0 ? (used / budget) * 100 : 0);
  const isOverBudget = remaining < 0;

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity onPress={onOpenCycles} activeOpacity={0.7}>
            <Text style={styles.monthLabel}>
              {activeMonth?.label || (isShared ? 'Shared' : 'Active Cycle')}
            </Text>
          </TouchableOpacity>

          {!isShared && activeMonth && (
            <TouchableOpacity
              onPress={handleOpenEditCycle}
              style={styles.editCycleBtn}
              activeOpacity={0.7}
              accessibilityLabel="Edit cycle and budget"
            >
              <Pencil size={11} color={Colors.light.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.personalBadge, isShared && styles.sharedBadge]}
            onPress={handleToggleMode}
            activeOpacity={0.7}
          >
            {isShared ? (
              <Users size={12} color={Colors.light.primary} />
            ) : (
              <ShieldCheck size={12} color={Colors.light.primary} />
            )}
            <Text style={styles.badgeText}>
              {isShared ? (selectedGroup?.name || 'Shared') : 'Personal'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.endCycleButton}
          onPress={() => setIsMonthEndOpen(true)}
          activeOpacity={0.7}
        >
          <CalendarCheck size={15} color="#FFFFFF" />
          <Text style={styles.endCycleText}>End Cycle</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.light.primary]}
          />
        }
      >
        {/* Stat Callouts Row (Spec B.8) */}
        <View style={styles.statsRow}>
          <StatCallout
            label="Total Budget"
            value={formatPaisa(budget)}
            subtext={!isShared && activeMonth ? "Target allowance (tap to edit)" : "Target allowance"}
            variant="primary"
            onPress={!isShared && activeMonth ? handleOpenEditCycle : undefined}
          />
          <StatCallout
            label="Spent So Far"
            value={formatPaisa(used)}
            subtext={`${percentageUsed.toFixed(0)}% used`}
            variant="spent"
          />
          <StatCallout
            label="Remaining"
            value={formatPaisa(remaining)}
            subtext={isOverBudget ? 'Over budget' : 'Under limit'}
            variant="remaining"
            isOverBudget={isOverBudget}
          />
        </View>

        {/* Quick Add Expense Form */}
        <QuickExpenseForm
          categories={categories}
          onSubmit={handleCreateExpense}
        />

        {/* Ledger Transactions Section */}
        <View style={styles.ledgerSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <Text style={styles.transactionCount}>
              {monthDetail?.expenses?.length || 0} entries
            </Text>
          </View>

          <View style={styles.ledgerCard}>
            {monthDetail?.expenses && monthDetail.expenses.length > 0 ? (
              monthDetail.expenses.map((expense) => (
                <LedgerRow
                  key={expense.id}
                  expense={expense}
                  onDelete={(item) => setExpenseToDelete(item)}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No expenses recorded yet</Text>
                <Text style={styles.emptySubtitle}>
                  Use the quick entry above to record your first transaction.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Edit Cycle & Budget Modal */}
      <Modal
        transparent
        visible={isEditCycleOpen}
        animationType="fade"
        onRequestClose={() => setIsEditCycleOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsEditCycleOpen(false)}>
          <View style={styles.editModalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.editModalCard}>
                {/* Header */}
                <View style={styles.editModalHeader}>
                  <View style={styles.editModalTitleRow}>
                    <View style={styles.editModalIcon}>
                      <Pencil size={16} color={Colors.light.primary} />
                    </View>
                    <View>
                      <Text style={styles.editModalTitle}>Edit Cycle & Budget</Text>
                      <Text style={styles.editModalSubtitle}>
                        Rename your cycle or adjust the budget.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setIsEditCycleOpen(false)}>
                    <X size={20} color={Colors.light.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Cycle Name */}
                <View style={styles.editInputGroup}>
                  <Text style={styles.editInputLabel}>Cycle Label / Name</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editLabel}
                    onChangeText={setEditLabel}
                    placeholder="e.g. October 2026, Week 3"
                    placeholderTextColor={Colors.light.textSecondary}
                  />
                </View>

                {/* Budget */}
                <View style={styles.editInputGroup}>
                  <Text style={styles.editInputLabel}>Budget Allowance (PKR)</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editBudgetPkr}
                    onChangeText={setEditBudgetPkr}
                    keyboardType="numeric"
                    placeholder="e.g. 100000"
                    placeholderTextColor={Colors.light.textSecondary}
                  />
                </View>

                {/* Presets */}
                <View style={styles.presetsRow}>
                  {[5000, 25000, 50000, 100000].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={styles.presetBtn}
                      onPress={() => setEditBudgetPkr(String(amt))}
                    >
                      <Text style={styles.presetBtnText}>Rs {(amt / 1000).toFixed(0)}k</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Actions */}
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.editBtn, styles.editCancelBtn]}
                    onPress={() => setIsEditCycleOpen(false)}
                    disabled={editSubmitting}
                  >
                    <Text style={styles.editCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editBtn, styles.editSaveBtn, editSubmitting && styles.disabledBtn]}
                    onPress={handleSaveEditCycle}
                    disabled={editSubmitting}
                  >
                    <DollarSign size={14} color="#FFFFFF" />
                    <Text style={styles.editSaveText}>
                      {editSubmitting ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Month-End Rollover Modal */}
      <MonthEndModal
        isOpen={isMonthEndOpen}
        currentMonth={activeMonth}
        onClose={() => setIsMonthEndOpen(false)}
        onEndMonth={handleEndMonth}
      />

      {/* Shared Expense Group Modal */}
      <SharedExpenseModal
        isOpen={isSharedModalOpen}
        selectedId={selectedGroup?.id || null}
        onSelectSharedExpense={(group) => {
          setSelectedGroup(group);
          setIsShared(true);
          setIsSharedModalOpen(false);
        }}
        onClose={() => setIsSharedModalOpen(false)}
      />

      {/* Custom Confirm Dialog (Spec B.8) */}
      <ConfirmModal
        isOpen={!!expenseToDelete}
        title="Delete Expense"
        description={
          expenseToDelete
            ? `Are you sure you want to delete "${expenseToDelete.content}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setExpenseToDelete(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.textPrimary,
  },
  editCycleBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.light.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.light.primarySoft,
    borderRadius: 12,
  },
  sharedBadge: {
    backgroundColor: 'rgba(11, 79, 74, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  endCycleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  endCycleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  ledgerSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.textPrimary,
  },
  transactionCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  ledgerCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  // Edit Cycle Modal
  editModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 19, 17, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  editModalTitleRow: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  editModalIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.light.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.textPrimary,
  },
  editModalSubtitle: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  editInputGroup: {
    gap: 5,
  },
  editInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textPrimary,
  },
  editInput: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.surfaceRaised,
    fontSize: 14,
    color: Colors.light.textPrimary,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.light.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  editBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  editCancelBtn: {
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  editCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textPrimary,
  },
  editSaveBtn: {
    backgroundColor: Colors.light.primary,
  },
  editSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
