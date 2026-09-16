import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Layers, Calendar, CheckSquare, UserCheck } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export type TabType = 'ledger' | 'cycles' | 'todo' | 'account';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const { colors } = useTheme();

  const tabs = [
    { id: 'ledger' as TabType, label: 'Ledger', icon: Layers },
    { id: 'cycles' as TabType, label: 'Cycles', icon: Calendar },
    { id: 'todo' as TabType, label: 'Wishlist', icon: CheckSquare },
    { id: 'account' as TabType, label: 'Account', icon: UserCheck },
  ];

  return (
    <View style={[styles.navBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => onSelectTab(tab.id)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                isActive && { backgroundColor: colors.primarySoft },
              ]}
            >
              <Icon
                size={18}
                color={isActive ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.tabText,
                { color: isActive ? colors.primary : colors.textSecondary },
                isActive && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    height: 60,
    flexDirection: 'row',
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 16,
  },
  iconContainer: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tabText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '700',
  },
});
