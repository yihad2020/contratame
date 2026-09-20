import { Stack } from 'expo-router';

import { WorkerOnboardingProvider } from '@/modules/worker/onboarding-context';

export default function WorkerOnboardingLayout() {
  return (
    <WorkerOnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </WorkerOnboardingProvider>
  );
}
