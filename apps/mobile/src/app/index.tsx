import { Redirect } from 'expo-router';
import { useAuth } from '@/modules/auth/auth-context';

export default function Index() {
  const { state } = useAuth();
  if (state === 'active') return <Redirect href="/(app)/home" />;
  if (state === 'verificationRequired') return <Redirect href="/verify-email" />;
  if (state === 'suspended' || state === 'deactivated') return <Redirect href="/blocked" />;
  if (state === 'profileMissing' || state === 'error') return <Redirect href="/account-error" />;
  return <Redirect href="/(auth)/sign-in" />;
}
