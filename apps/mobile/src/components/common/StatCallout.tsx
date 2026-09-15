import React, { FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/colors';

interface StatCalloutProps {
  label: string;
  value: string;
  subtext?: string;
  variant?: 'primary' | 'spent' | 'remaining';
  isOverBudget?: boolean;
  onPress?: () => void;
}

export const StatCallout: FC<StatCalloutProps> = ({
  label,
  value,
  subtext,
  variant = 'primary',
  isOverBudget = false,
  onPress,
}) => {
  const theme = Colors.light;

  let valueColor = theme.textPrimary;
  if (variant === 'spent') {
    valueColor = theme.expenseAlert;
  } else if (variant === 'remaining') {
    valueColor = isOverBudget ? theme.expenseAlert : theme.incomePositive;
  }

  const content = (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.card}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#1C1B19',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 11.5,
    color: Colors.light.textSecondary,
  },
});
