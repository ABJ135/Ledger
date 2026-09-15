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

initSentryMobile();

function MainNavigator() {
  const [currentTab, setCurrentTab] = useState<TabType>('ledger');
  const { isDark, colors } = useTheme();

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
    backgroundColor: Colors.light.surface,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  screenContent: {
    flex: 1,
  },
});
