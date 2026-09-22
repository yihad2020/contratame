import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorMessage } from '@/components/ui/Typography';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';
import type { WorkerProfile } from '@/modules/worker/types';
import { workerFailureMessage } from '@/modules/worker/worker-errors';
import { getWorkerCardCopy } from '@/modules/worker/validation';
import { getOwnWorkerProfile, startOrResumeWorkerOnboarding } from '@/modules/worker/worker-service';

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [workerLoading, setWorkerLoading] = useState(true);
  const [workerLoadError, setWorkerLoadError] = useState<string | null>(null);
  const [startingWorker, setStartingWorker] = useState(false);
  const startingWorkerRef = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setWorkerLoading(true);
    setWorkerLoadError(null);
    void getOwnWorkerProfile()
      .then((result) => { if (active) setWorker(result); })
      .catch((cause) => { if (active) setWorkerLoadError(workerFailureMessage(cause, 'No se pudo consultar tu perfil profesional. Toca la tarjeta para reintentar.', 'load worker status')); })
      .finally(() => { if (active) setWorkerLoading(false); });
    return () => { active = false; };
  }, []));

  const workerCopy = getWorkerCardCopy(worker?.approval_status ?? null);

  async function openWorkerProfile() {
    if (startingWorkerRef.current || workerLoading) return;
    startingWorkerRef.current = true;
    setStartingWorker(true);
    try {
      const current = await startOrResumeWorkerOnboarding();
      setWorker(current);
      setWorkerLoadError(null);
      router.push('/(app)/worker-onboarding' as never);
    } catch (cause) {
      const message = workerFailureMessage(cause, 'Inténtalo nuevamente.', 'start or resume worker');
      setWorkerLoadError(message);
      Alert.alert('No pudimos abrir tu perfil', message);
    } finally { startingWorkerRef.current = false; setStartingWorker(false); }
  }

  function showComingSoon(feature: string) {
    Alert.alert('Próximamente', feature + ' estará disponible en una siguiente etapa de Contrátame!.');
  }

  return (
    <Screen contentStyle={styles.screen} footer={<MarketplaceNav active="home" />} header={<MarketplaceHeader
        action={{ label: 'Abrir mi perfil', icon: 'account', onPress: () => router.push('/(app)/profile') }}
        brand
        eyebrow={`Hola, ${profile?.first_name ?? 'bienvenido'}`}
        title="¿Qué quieres hacer hoy?"
        subtitle="Servicios y oportunidades cerca de ti."
      />}>
      <View style={styles.choices}>
        <Text style={styles.sectionLabel}>TU PRÓXIMO PASO</Text>
        <ChoiceCard
          description="Encuentra profesionales cerca de ti."
          icon="search"
          onPress={() => showComingSoon('La búsqueda de profesionales')}
          title="Necesito un servicio"
        />
        <ChoiceCard
          accent="green"
          description={startingWorker ? 'Preparando tu perfil…' : workerLoading ? 'Cargando tu estado profesional…' : workerLoadError ?? workerCopy.description}
          icon="tools"
          onPress={() => void openWorkerProfile()}
          title={workerLoadError ? 'Reintentar perfil profesional' : workerCopy.title}
        />
        {workerLoadError ? <ErrorMessage>{workerLoadError}</ErrorMessage> : null}
      </View>
      <View style={styles.profileSection}>
        <SectionHeader
          actionLabel="Editar"
          onAction={() => router.push('/(app)/profile')}
          title="Tu perfil"
        />
        <View style={styles.profileSurface}>
          <Text style={styles.profileName}>
            {profile ? profile.first_name + ' ' + profile.last_name : 'Cuenta Contrátame!'}
          </Text>
          <Text numberOfLines={1} style={styles.email}>{user?.email}</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.xl },
  choices: { gap: spacing.md },
  sectionLabel: { color: colors.textSecondary, ...typography.overline },
  profileSection: { gap: spacing.xs, marginTop: spacing.xs },
  profileSurface: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  profileName: { color: colors.text, ...typography.bodyStrong },
  email: { color: colors.textSecondary, ...typography.caption },
});
