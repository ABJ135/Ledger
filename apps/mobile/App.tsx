import React, { useState } from 'react';
import { StyleSheet, SafeAreaView, View, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LandingScreen } from './src/screens/LandingScreen';
import { MonthViewScreen } from './src/screens/MonthViewScreen';
import { TodoScreen } from './src/screens/TodoScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { BottomNav, TabType } from './src/components/layout/BottomNav';
import { Colors } from './src/theme/colors';
import { initSentryMobile, Sentry } from './src/sentry';
import { initMobileApi } from './src/config/api';

initSentryMobile();
initMobileApi();

import { useAuth } from './src/context/AuthContext';
import { AuthModal } from './src/components/auth/AuthModal';

function MainNavigator() {
  const [currentTab, setCurrentTab] = useState<TabType>('ledger');
  const { isDark, colors } = useTheme();
  const { user, isLoading } = useAuth();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.surface} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.screenContent}>
          {currentTab === 'ledger' && (
            <LandingScreen onOpenCycles={() => setCurrentTab('cycles')} />
          )}
          {currentTab === 'cycles' && <MonthViewScreen />}
          {currentTab === 'todo' && <TodoScreen />}
          {currentTab === 'account' && <AccountScreen />}
        </View>

        <BottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
        />
      </View>

      {/* When logged out, display AuthModal */}
      {!isLoading && !user && (
        <AuthModal
          isOpen={!user}
          onClose={() => {}}
          initialMode="login"
          canDismiss={false}
        />
      )}
    </SafeAreaView>
  );
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <MainNavigator />
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  screenContent: {
    flex: 1,
  },
});
