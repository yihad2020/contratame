import { Redirect, Stack } from 'expo-router';

import { colors } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';

export default function ProtectedLayout() {
  const { state } = useAuth();

  if (state !== 'active') return <Redirect href="/" />;

  return <Stack screenOptions={{ animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background }, headerShown: false }} />;
}
