import { Redirect, router } from 'expo-router';

import { AppButton } from '@/components/ui/AppButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage } from '@/components/ui/Typography';
import { useWorkerOnboarding } from '@/modules/worker/onboarding-context';
import { getCompletionSections } from '@/modules/worker/validation';

export default function WorkerOnboardingIndex() {
  const { draft, loading, error, reload } = useWorkerOnboarding();
  if (loading) return <LoadingState />;
  if (error || !draft) {
    return (
      <Screen>
        <AppHeader variant="navigation" title="Perfil profesional" onBack={() => router.replace('/(app)/home')} />
        <ErrorMessage>{error ?? 'No existe un perfil profesional para continuar.'}</ErrorMessage>
        <AppButton label="Reintentar" onPress={() => void reload().catch(() => undefined)} />
      </Screen>
    );
  }
  if (draft.worker.approval_status !== 'draft' && draft.worker.approval_status !== 'rejected') {
    return <Redirect href={'/(app)/worker-onboarding/status' as never} />;
  }
  const firstIncomplete = getCompletionSections(draft).find((section) => !section.optional && !section.complete);
  const resumeStep = firstIncomplete?.step ?? 6;
  return <Redirect href={`/(app)/worker-onboarding/step/${resumeStep}` as never} />;
}
