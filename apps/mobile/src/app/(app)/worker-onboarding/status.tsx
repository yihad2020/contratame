import { router } from 'expo-router';

import { AppButton } from '@/components/ui/AppButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorMessage } from '@/components/ui/Typography';
import { Screen } from '@/components/ui/Screen';
import { useWorkerOnboarding } from '@/modules/worker/onboarding-context';
import { WorkerStatusScreen } from '@/modules/worker/screens/WorkerStatusScreen';

export default function WorkerStatusRoute() {
  const { draft, loading, error, reload } = useWorkerOnboarding();
  if (loading) return <LoadingState />;
  if (error || !draft) return <Screen>
    <ErrorMessage>{error ?? 'No se pudo cargar el estado profesional.'}</ErrorMessage>
    <AppButton label="Reintentar" onPress={() => void reload().catch(() => undefined)} />
    <AppButton label="Volver al inicio" variant="ghost" onPress={() => router.replace('/(app)/home')} />
  </Screen>;
  return <WorkerStatusScreen />;
}
