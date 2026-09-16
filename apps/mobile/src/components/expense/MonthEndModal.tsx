import React, { FC, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Month, MonthSummary } from '@repo/shared-types';
import { CalendarCheck, X, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { formatPaisa, paisaToRupees, rupeesToPaisa } from '../../utils/currency';
import { IconCircle } from '../common/IconCircle';

interface MonthEndModalProps {
  isOpen: boolean;
  currentMonth: Month | null;
  onClose: () => void;
  onEndMonth: (nextBudgetInPaisa: number, nextLabel?: string) => Promise<MonthSummary>;
}

export const MonthEndModal: FC<MonthEndModalProps> = ({
  isOpen,
  currentMonth,
  onClose,
  onEndMonth,
}) => {
  const { colors } = useTheme();
  const [nextRupees, setNextRupees] = useState(() =>
    currentMonth ? paisaToRupees(currentMonth.budget).toString() : '100000',
  );
  const [nextLabel, setNextLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<MonthSummary | null>(null);

  if (!isOpen || !currentMonth) return null;

  const handleSubmit = async () => {
    const parsed = parseFloat(nextRupees);
    if (isNaN(parsed) || parsed < 0) return;

    try {
      setIsSubmitting(true);
      const nextBudgetInPaisa = rupeesToPaisa(parsed);
      const label = nextLabel.trim() || undefined;
      const res = await onEndMonth(nextBudgetInPaisa, label);
      setSummary(res);
    } catch (err) {
      console.error('Failed to end cycle:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSummary(null);
    setNextLabel('');
    onClose();
  };

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <IconCircle
                size={36}
                color={summary ? colors.incomePositive : colors.primary}
              >
                {summary ? (
                  <CheckCircle2 size={20} color={summary ? colors.incomePositive : colors.primary} />
                ) : (
                  <CalendarCheck size={20} color={colors.primary} />
                )}
              </IconCircle>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {summary ? 'Cycle Completed!' : `End ${currentMonth.label}`}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {summary
                    ? 'Here is your final financial breakdown'
                    : 'Close this cycle and open your next billing period'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {!summary ? (
            <View style={styles.content}>
              <View style={[styles.statBox, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Current Total Budget</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatPaisa(currentMonth.budget)}</Text>
                <Text style={[styles.statNote, { color: colors.textSecondary }]}>
                  Closing this cycle sets its end date to now and rolls your ledger forward
                  seamlessly with 0 gap.
                </Text>
              </View>

              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Next Cycle Label (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, color: colors.textPrimary }]}
                  value={nextLabel}
                  onChangeText={setNextLabel}
                  placeholder="e.g. October 2026, Week 3…"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
                  Leave blank for a smart auto-generated name.
                </Text>
              </View>

              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Next Cycle Budget (in PKR)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, color: colors.textPrimary }]}
                  keyboardType="numeric"
                  value={nextRupees}
                  onChangeText={setNextRupees}
                  placeholder="e.g. 100000"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }, isSubmitting && styles.disabledBtn]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <Text style={styles.primaryBtnText}>
                    {isSubmitting ? 'Closing...' : 'Close & Rollover'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView style={styles.summaryContent}>
              <View style={styles.summaryStatsRow}>
                <View style={styles.summaryStat}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Spent</Text>
                  <Text style={[styles.statValue, { color: colors.expenseAlert }]}>
                    {formatPaisa(summary.totalSpent)}
                  </Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Remaining</Text>
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color:
                          summary.remaining < 0
                            ? colors.expenseAlert
                            : colors.incomePositive,
                      },
                    ]}
                  >
                    {formatPaisa(summary.remaining)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.breakdownHeader, { color: colors.textPrimary }]}>Category Breakdown</Text>
              {summary.categoryBreakdown.map((cat) => (
                <View key={cat.categoryId} style={styles.categoryRow}>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.catName, { color: colors.textPrimary }]}>{cat.categoryName}</Text>
                    <Text style={[styles.catSpent, { color: colors.textSecondary }]}>{formatPaisa(cat.total)}</Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceRaised }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(cat.percentage, 100)}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.catPercentage, { color: colors.textSecondary }]}>{cat.percentage.toFixed(1)}%</Text>
                </View>
              ))}

              <TouchableOpacity style={[styles.doneButton, { backgroundColor: colors.primary }]} onPress={handleClose}>
                <Text style={styles.doneButtonText}>Done</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 19, 17, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    maxHeight: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    gap: 14,
  },
  statBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 6,
  },
  statNote: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputSection: {
    gap: 6,
  },
  inputHint: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  summaryContent: {
    paddingVertical: 8,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryStat: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  breakdownHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  categoryRow: {
    marginBottom: 10,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catName: {
    fontSize: 13,
    fontWeight: '500',
  },
  catSpent: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  catPercentage: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 2,
  },
  doneButton: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
