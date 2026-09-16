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
  useUpdateMonthMutation,
  useGetMySharedExpensesQuery,
} from '@repo/api-client';
import { CalendarCheck, ShieldCheck, Users, Pencil, Calendar, LogIn, Sparkles, Sun, Moon } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { formatPaisa } from '../utils/currency';
import { formatPktDate } from '../utils/date';
import { StatCallout } from '../components/common/StatCallout';
import { LedgerRow } from '../components/expense/LedgerRow';
import { QuickExpenseForm } from '../components/expense/QuickExpenseForm';
import { MonthEndModal } from '../components/expense/MonthEndModal';
import { EditCycleModal } from '../components/expense/EditCycleModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { SharedExpenseModal } from '../components/shared/SharedExpenseModal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AuthModal, MobileAuthMode } from '../components/auth/AuthModal';

interface LandingScreenProps {
  onOpenCycles: () => void;
}

export const LandingScreen: FC<LandingScreenProps> = ({ onOpenCycles }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, isGuest } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<MobileAuthMode>('login');

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

  const handleSaveCycle = async (data: { id?: string; label: string; budget: number }) => {
    if (!data.id) return;
    await updateMonth({
      id: data.id,
      data: {
        label: data.label,
        budget: data.budget,
      },
    }).unwrap();
    await Promise.all([refetchMonths(), refetchDetail()]);
  };

  if (monthsLoading || (activeMonth && detailLoading && !monthDetail)) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading ledger...</Text>
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity onPress={onOpenCycles} activeOpacity={0.7}>
            <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
              {activeMonth?.label || (isShared ? 'Shared' : 'Active Cycle')}
            </Text>
          </TouchableOpacity>

          {activeMonth && (
            <TouchableOpacity
              onPress={() => setIsEditCycleOpen(true)}
              style={[styles.editCycleBtn, { backgroundColor: colors.primarySoft }]}
              activeOpacity={0.7}
              accessibilityLabel="Edit cycle and budget"
            >
              <Pencil size={12} color={colors.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.personalBadge, { backgroundColor: colors.primarySoft }, isShared && styles.sharedBadge]}
            onPress={handleToggleMode}
            activeOpacity={0.7}
          >
            {isShared ? (
              <Users size={12} color={colors.primary} />
            ) : (
              <ShieldCheck size={12} color={colors.primary} />
            )}
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              {isShared ? (selectedGroup?.name || 'Shared') : 'Personal'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={[styles.themeToggleBtn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isDark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {isDark ? <Sun size={15} color={colors.primary} /> : <Moon size={15} color={colors.primary} />}
          </TouchableOpacity>

          {isGuest && (
            <TouchableOpacity
              style={[styles.loginPillBtn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
              onPress={() => {
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
              }}
              activeOpacity={0.7}
              accessibilityLabel="Sign in with existing account"
            >
              <LogIn size={12} color={colors.primary} />
              <Text style={[styles.loginPillText, { color: colors.primary }]}>Log In</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.endCycleButton, { backgroundColor: colors.primary }]}
            onPress={() => setIsMonthEndOpen(true)}
            activeOpacity={0.7}
          >
            <CalendarCheck size={15} color="#FFFFFF" />
            <Text style={styles.endCycleText}>End Cycle</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Guest Warning & Upgrade Banner */}
        {isGuest && (
          <TouchableOpacity
            style={[
              styles.guestBanner,
              isDark && { backgroundColor: '#2A2312', borderColor: '#5C4A1A' },
            ]}
            onPress={() => {
              setAuthModalMode('upgrade');
              setIsAuthModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.guestBannerContent}>
              <Sparkles size={14} color="#E0AC55" />
              <Text
                style={[
                  styles.guestBannerText,
                  isDark && { color: '#F3E1B9' },
                ]}
                numberOfLines={1}
              >
                Guest Session • Save data to prevent loss
              </Text>
            </View>
            <Text style={[styles.guestBannerCta, { color: colors.primary }]}>Save Data →</Text>
          </TouchableOpacity>
        )}

        {/* Active Cycle Header Card */}
        {activeMonth && (
          <TouchableOpacity
            style={[styles.cycleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setIsEditCycleOpen(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Edit cycle name and budget"
          >
            <View style={styles.cycleCardLeft}>
              <View style={[styles.cycleIconCircle, { backgroundColor: colors.primarySoft }]}>
                <Calendar size={18} color={colors.primary} />
              </View>
              <View style={styles.cycleInfo}>
                <View style={styles.cycleTitleRow}>
                  <Text style={[styles.cycleTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {monthDetail?.label || activeMonth.label}
                  </Text>
                  <View style={[styles.cycleInlineEdit, { backgroundColor: colors.primarySoft }]}>
                    <Pencil size={11} color={colors.primary} />
                  </View>
                </View>
                <Text style={[styles.cycleSubtitle, { color: colors.textSecondary }]}>
                  Started {formatPktDate(activeMonth.startAt)} • Active Cycle
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.editBudgetButton, { backgroundColor: colors.primarySoft, borderColor: colors.primary + '35' }]}
              onPress={() => setIsEditCycleOpen(true)}
              activeOpacity={0.7}
              accessibilityLabel="Edit cycle and budget"
            >
              <Pencil size={12} color={colors.primary} />
              <Text style={[styles.editBudgetText, { color: colors.primary }]}>Edit Budget</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Stat Callouts Row */}
        <View style={styles.statsRow}>
          <StatCallout
            label="Total Budget"
            value={formatPaisa(budget)}
            subtext="Target allowance"
            variant="primary"
            onPress={activeMonth ? () => setIsEditCycleOpen(true) : undefined}
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
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Transactions</Text>
            <Text style={[styles.transactionCount, { color: colors.textSecondary }]}>
              {monthDetail?.expenses?.length || 0} entries
            </Text>
          </View>

          <View style={[styles.ledgerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No expenses recorded yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Use the quick entry above to record your first transaction.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Edit Cycle & Budget Modal */}
      <EditCycleModal
        isOpen={isEditCycleOpen}
        cycle={
          activeMonth
            ? {
                id: activeMonth.id,
                label: monthDetail?.label || activeMonth.label,
                budget: monthDetail?.budget ?? activeMonth.budget,
              }
            : null
        }
        onClose={() => setIsEditCycleOpen(false)}
        onSave={handleSaveCycle}
      />

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

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        canDismiss={Boolean(user)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  editCycleBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sharedBadge: {
    opacity: 0.9,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  themeToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCycleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  },
  transactionCount: {
    fontSize: 12,
  },
  ledgerCard: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  // Active Cycle Header Card
  cycleCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    gap: 10,
  },
  cycleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cycleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleInfo: {
    flex: 1,
  },
  cycleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cycleTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cycleInlineEdit: {
    padding: 3,
    borderRadius: 6,
  },
  cycleSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  editBudgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  editBudgetText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loginPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  loginPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#F5DE9C',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },
  guestBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  guestBannerText: {
    fontSize: 11.5,
    color: '#7D5A12',
    fontWeight: '500',
    flex: 1,
  },
  guestBannerCta: {
    fontSize: 11.5,
    fontWeight: '700',
    marginLeft: 8,
  },
});
