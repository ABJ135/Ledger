import React, { FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

interface StatCalloutProps {
  label: string;
  value: string;
  subtext?: string;
  variant?: 'primary' | 'spent' | 'remaining';
  isOverBudget?: boolean;
  onPress?: () => void;
  isEditable?: boolean;
}

export const StatCallout: FC<StatCalloutProps> = ({
  label,
  value,
  subtext,
  variant = 'primary',
  isOverBudget = false,
  onPress,
  isEditable = false,
}) => {
  const { colors } = useTheme();

  let valueColor = colors.textPrimary;
  if (variant === 'spent') {
    valueColor = colors.expenseAlert;
  } else if (variant === 'remaining') {
    valueColor = isOverBudget ? colors.expenseAlert : colors.incomePositive;
  }

  const showEditIndicator = Boolean(onPress || isEditable);

  const content = (
    <>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
        {showEditIndicator && (
          <View style={[styles.editBadge, { backgroundColor: colors.primarySoft }]}>
            <Pencil size={9} color={colors.primary} />
            <Text style={[styles.editText, { color: colors.primary }]}>Edit</Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <View style={styles.footerRow}>
        {subtext ? (
          <Text style={[styles.subtext, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtext}
          </Text>
        ) : null}
        {showEditIndicator && (
          <Text style={[styles.adjustText, { color: colors.primary }]}>Adjust</Text>
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          showEditIndicator && [styles.cardEditable, { borderColor: colors.primary }],
        ]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}. Double tap to edit budget`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        showEditIndicator && styles.cardEditable,
      ]}
    >
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    justifyContent: 'space-between',
  },
  cardEditable: {
    borderWidth: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 4,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  editText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 2,
  },
  subtext: {
    fontSize: 11,
    flexShrink: 1,
  },
  adjustText: {
    fontSize: 10.5,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
