import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Layers, Calendar, CheckSquare, UserCheck } from 'lucide-react-native';
import { Colors } from '../../theme/colors';

export type TabType = 'ledger' | 'cycles' | 'todo' | 'account';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  return (
    <View style={styles.navBar}>
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('ledger')}
        activeOpacity={0.7}
      >
        <Layers
          size={19}
          color={currentTab === 'ledger' ? Colors.light.primary : Colors.light.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            currentTab === 'ledger' && styles.activeTabText,
          ]}
        >
          Ledger
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('cycles')}
        activeOpacity={0.7}
      >
        <Calendar
          size={19}
          color={currentTab === 'cycles' ? Colors.light.primary : Colors.light.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            currentTab === 'cycles' && styles.activeTabText,
          ]}
        >
          Cycles
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('todo')}
        activeOpacity={0.7}
      >
        <CheckSquare
          size={19}
          color={currentTab === 'todo' ? Colors.light.primary : Colors.light.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            currentTab === 'todo' && styles.activeTabText,
          ]}
        >
          Wishlist
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('account')}
        activeOpacity={0.7}
      >
        <UserCheck
          size={19}
          color={currentTab === 'account' ? Colors.light.primary : Colors.light.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            currentTab === 'account' && styles.activeTabText,
          ]}
        >
          Account
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    height: 56,
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  tabText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  activeTabText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
});
