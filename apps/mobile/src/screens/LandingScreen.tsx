import React, { FC, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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
  useGetMySharedExpensesQuery,
} from '@repo/api-client';
import { CalendarCheck, ShieldCheck, Users } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { formatPaisa } from '../utils/currency';
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

  const [isMonthEndOpen, setIsMonthEndOpen] = useState(false);
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

  const handleEndMonth = async (nextBudgetInPaisa: number) => {
    const res = await endCurrentMonth({ budget: nextBudgetInPaisa }).unwrap();
    await refetchMonths();
    return res;
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
            subtext="Target allowance"
            variant="primary"
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
});
