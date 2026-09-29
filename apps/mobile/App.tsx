import './src/intl-polyfills';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { minTapTarget, spacing, typography } from '@tb/ui';
import { AppProvider, useApp } from './src/app-context';
import { AuthScreen, BookingsScreen, HomeScreen, OnboardingScreen, ProfileScreen } from './src/screens';

type Tab = 'home' | 'bookings' | 'profile';

/**
 * Phase 1 shell: onboarding → sign-in → three tabs. A navigation library
 * (expo-router) is introduced in phase 2 when the search/checkout flows arrive.
 */
function Shell() {
  const { ready, onboarded, me, t, c } = useApp();
  const [tab, setTab] = useState<Tab>('home');

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <ActivityIndicator color={c.primary} accessibilityLabel={t('common.loading')} />
      </View>
    );
  }
  if (!onboarded) return <OnboardingScreen />;
  if (!me) return <AuthScreen />;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'home', label: t('nav.home') },
    { key: 'bookings', label: t('nav.bookings') },
    { key: 'profile', label: t('nav.profile') },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' ? <HomeScreen /> : tab === 'bookings' ? <BookingsScreen /> : <ProfileScreen />}
      </View>
      <View
        accessibilityRole="tablist"
        style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }}
      >
        {tabs.map((x) => (
          <Pressable
            key={x.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === x.key }}
            onPress={() => setTab(x.key)}
            style={{ flex: 1, minHeight: minTapTarget + 8, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm }}
          >
            <Text
              style={{
                fontSize: typography.size.sm,
                fontWeight: tab === x.key ? '700' : '400',
                color: tab === x.key ? c.primary : c.textMuted,
              }}
            >
              {x.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Themed() {
  const { c, theme } = useApp();
  const dark = c.background === '#0E1116';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={['top', 'bottom']}>
      <StatusBar style={theme === 'SYSTEM' ? 'auto' : dark ? 'light' : 'dark'} />
      <Shell />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Themed />
      </AppProvider>
    </SafeAreaProvider>
  );
}
