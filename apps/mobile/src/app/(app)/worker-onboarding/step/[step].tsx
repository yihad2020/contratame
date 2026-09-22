import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { AppButton } from '@/components/ui/AppButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorMessage } from '@/components/ui/Typography';
import { Screen } from '@/components/ui/Screen';
import { useWorkerOnboarding } from '@/modules/worker/onboarding-context';
import { AvailabilityStep } from '@/modules/worker/screens/AvailabilityStep';
import { LocationStep } from '@/modules/worker/screens/LocationStep';
import { PortfolioStep } from '@/modules/worker/screens/PortfolioStep';
import { ProfessionalStep } from '@/modules/worker/screens/ProfessionalStep';
import { ReviewStep } from '@/modules/worker/screens/ReviewStep';
import { ServicesStep } from '@/modules/worker/screens/ServicesStep';

const screens = {
  '1': ProfessionalStep,
  '2': ServicesStep,
  '3': LocationStep,
  '4': AvailabilityStep,
  '5': PortfolioStep,
  '6': ReviewStep,
} as const;

export default function WorkerOnboardingStepRoute() {
  const params = useLocalSearchParams<{ step: string }>();
  const { draft, loading, error, reload } = useWorkerOnboarding();
  if (loading) return <LoadingState />;
  if (error || !draft) return <Screen>
    <ErrorMessage>{error ?? 'No se pudo cargar el perfil profesional.'}</ErrorMessage>
    <AppButton label="Reintentar" onPress={() => void reload().catch(() => undefined)} />
    <AppButton label="Volver al inicio" variant="ghost" onPress={() => router.replace('/(app)/home')} />
  </Screen>;
  if (!['draft', 'rejected'].includes(draft.worker.approval_status)) return <Redirect href={'/(app)/worker-onboarding/status' as never} />;
  const StepScreen = screens[params.step as keyof typeof screens];
  if (!StepScreen) return <Redirect href={'/(app)/worker-onboarding/step/1' as never} />;
  return <StepScreen />;
}
