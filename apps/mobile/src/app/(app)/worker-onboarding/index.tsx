import { Redirect, router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Card } from '@/components/ui/Kit';
import { LoadingState } from '@/components/ui/LoadingState';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage } from '@/components/ui/Typography';
import { useWorkerOnboarding } from '@/modules/worker/onboarding-context';
import { getCompletionSections } from '@/modules/worker/validation';

export default function WorkerOnboardingIndex() {
  const { draft, loading, error, reload } = useWorkerOnboarding();
  if (loading) return <LoadingState />;
  if (error || !draft) {
    return (
      <Screen contentStyle={styles.screen} header={<MarketplaceHeader barTitle="Perfil profesional" back={() => router.replace('/(app)/home')} />}>
        <Card style={styles.card}>
          <ErrorMessage>{error ?? 'No existe un perfil profesional para continuar.'}</ErrorMessage>
          <PillButton label="Reintentar" icon="refresh" onPress={() => void reload().catch(() => undefined)} />
        </Card>
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

const styles = StyleSheet.create({
  screen: { gap: 16, paddingTop: 20 },
  card: { gap: 14 },
});
