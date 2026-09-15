import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Shield, LogOut, CheckCircle2, UserCheck, Sun, Moon, Smartphone } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../theme/colors';
import { IconCircle } from '../components/common/IconCircle';

export const AccountScreen: FC = () => {
  const { user, logout } = useAuth();
  const { mode, colors, setMode } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Account & Session</Text>
        <Text style={styles.subtitle}>Authentication status and app profile</Text>
      </View>

      <View style={styles.content}>
        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <IconCircle size={40} color={Colors.light.primary}>
              <UserCheck size={20} color={Colors.light.primary} />
            </IconCircle>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>
                {user?.email || 'Guest User'}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.statusBadge}>
                  <CheckCircle2 size={11} color={Colors.light.incomePositive} />
                  <Text style={styles.statusText}>
                    {user?.isGuest ? 'Guest Session' : 'Registered Account'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <Text style={styles.detailLabel}>User ID</Text>
            <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
              {user?.id || 'Active Session'}
            </Text>
          </View>
        </View>

        {/* Theme Appearance */}
        <View style={styles.card}>
          <View style={styles.infoHeader}>
            <Sun size={18} color={colors.primary} />
            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Appearance & Theme</Text>
          </View>
          <View style={styles.themeSelectorRow}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                mode === 'light' && [styles.themeOptionActive, { borderColor: colors.primary, backgroundColor: colors.primarySoft }],
              ]}
              onPress={() => setMode('light')}
              activeOpacity={0.7}
            >
              <Sun size={16} color={mode === 'light' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.themeOptionText, { color: mode === 'light' ? colors.primary : colors.textSecondary }]}>
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                mode === 'dark' && [styles.themeOptionActive, { borderColor: colors.primary, backgroundColor: colors.primarySoft }],
              ]}
              onPress={() => setMode('dark')}
              activeOpacity={0.7}
            >
              <Moon size={16} color={mode === 'dark' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.themeOptionText, { color: mode === 'dark' ? colors.primary : colors.textSecondary }]}>
                Dark
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                mode === 'system' && [styles.themeOptionActive, { borderColor: colors.primary, backgroundColor: colors.primarySoft }],
              ]}
              onPress={() => setMode('system')}
              activeOpacity={0.7}
            >
              <Smartphone size={16} color={mode === 'system' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.themeOptionText, { color: mode === 'system' ? colors.primary : colors.textSecondary }]}>
                System
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security & Info */}
        <View style={styles.card}>
          <View style={styles.infoHeader}>
            <Shield size={18} color={colors.primary} />
            <Text style={styles.infoTitle}>Architecture & Security</Text>
          </View>
          <Text style={styles.infoBody}>
            • Currency: Integer paisa standard (Spec A.4)
            {'\n'}• Timezone: Pakistan Standard Time fixed UTC+5 (Spec A.6)
            {'\n'}• Server-authoritative cycle calculations (Spec A.13)
            {'\n'}• Continuous timeline rollover with 0 gap
          </Text>
        </View>

        {/* Logout Action */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
          <LogOut size={16} color={colors.expenseAlert} />
          <Text style={styles.logoutText}>Reset Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textPrimary,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.surfaceRaised,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: Colors.light.incomePositive,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textPrimary,
    maxWidth: 200,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textPrimary,
  },
  infoBody: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  logoutButton: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.expenseAlert,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: Colors.light.expenseAlert,
    fontSize: 14,
    fontWeight: '600',
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  themeOption: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.light.surface,
  },
  themeOptionActive: {
    borderWidth: 1.5,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
