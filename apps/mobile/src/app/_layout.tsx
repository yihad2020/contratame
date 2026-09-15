import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/modules/auth/auth-context';

void SplashScreen.preventAutoHideAsync();

function Routes() {
  const { state } = useAuth();
  useEffect(() => { if (state !== 'loading') void SplashScreen.hideAsync(); }, [state]);
  if (state === 'loading') return <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /></View>;
  return <><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></>;
}

export default function RootLayout() {
  return <AuthProvider><Routes /></AuthProvider>;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background } });
