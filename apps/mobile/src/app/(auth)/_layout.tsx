import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/modules/auth/auth-context';
export default function AuthLayout() {
  const { state } = useAuth();
  if (state === 'active') return <Redirect href="/(app)/home" />;
  if (state === 'verificationRequired') return <Redirect href="/verify-email" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
