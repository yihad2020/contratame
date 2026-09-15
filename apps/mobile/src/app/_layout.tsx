import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { LoadingState } from '@/components/ui/LoadingState';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/modules/auth/auth-context';

void SplashScreen.preventAutoHideAsync();

function Routes() {
  const { state } = useAuth();

  useEffect(() => {
    if (state !== 'loading') void SplashScreen.hideAsync();
  }, [state]);

  if (state === 'loading') return <LoadingState />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ animation: 'fade', contentStyle: { backgroundColor: colors.background }, headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}
