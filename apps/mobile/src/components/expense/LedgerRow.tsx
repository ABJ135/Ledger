import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Expense } from '@repo/shared-types';
import {
  Utensils,
  Car,
  Zap,
  Home,
  ShoppingBag,
  HeartPulse,
  Gamepad2,
  Tag,
  Trash2,
  CloudOff,
} from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { IconCircle } from '../common/IconCircle';
import { formatPaisa } from '../../utils/currency';
import { formatPktTime } from '../../utils/date';

interface LedgerRowProps {
  expense: Expense;
  onDelete?: (expense: Expense) => void;
}

const getCategoryIcon = (categoryName?: string, color = '#0B4F4A') => {
  const name = (categoryName || '').toLowerCase();
  const size = 14;

  if (name.includes('food')) return <Utensils size={size} color={color} />;
  if (name.includes('transport')) return <Car size={size} color={color} />;
  if (name.includes('util')) return <Zap size={size} color={color} />;
  if (name.includes('rent')) return <Home size={size} color={color} />;
  if (name.includes('shop')) return <ShoppingBag size={size} color={color} />;
  if (name.includes('health')) return <HeartPulse size={size} color={color} />;
  if (name.includes('entertainment')) return <Gamepad2 size={size} color={color} />;
  return <Tag size={size} color={color} />;
};

export const LedgerRow: FC<LedgerRowProps> = ({ expense, onDelete }) => {
  const categoryName = expense.category?.name || 'General';
  const categoryColor = Colors.light.primary;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <IconCircle size={28} color={categoryColor}>
          {getCategoryIcon(categoryName, categoryColor)}
        </IconCircle>
        <View style={styles.details}>
          <Text style={styles.description} numberOfLines={1}>
            {expense.content}
          </Text>
          <Text style={styles.category}>{categoryName}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <View style={styles.amountContainer}>
          <View style={styles.amountRow}>
            {expense.syncStatus && expense.syncStatus !== 'synced' && (
              <CloudOff size={12} color={Colors.light.warning} style={styles.syncIcon} />
            )}
            <Text style={styles.amount}>{formatPaisa(expense.amount)}</Text>
          </View>
          <Text style={styles.time}>{formatPktTime(expense.occurredAt)}</Text>
        </View>

        {onDelete ? (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(expense)}
            activeOpacity={0.6}
            accessibilityLabel={`Delete ${expense.content}`}
          >
            <Trash2 size={15} color={Colors.light.expenseAlert} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: 4,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  details: {
    flex: 1,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.textPrimary,
    marginBottom: 2,
  },
  category: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncIcon: {
    marginRight: 2,
  },
  amount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textPrimary,
    letterSpacing: -0.2,
  },
  time: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
});
