import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ui } from '@/constants/theme';

const TOTAL_STEPS = 6;

export function OnboardingScaffold({
  step,
  title,
  description,
  children,
  onNext,
  nextLabel = 'Guardar y continuar',
  nextLoading = false,
  nextDisabled = false,
}: PropsWithChildren<{
  step: number;
  title: string;
  description: string;
  onNext?: () => void;
  nextLabel?: string;
  nextLoading?: boolean;
  nextDisabled?: boolean;
}>) {
  const goBack = () => step === 1 ? router.replace('/(app)/home') : router.push(`/(app)/worker-onboarding/step/${step - 1}` as never);
  return (
    <Screen
      contentStyle={styles.screen}
      header={(
        <MarketplaceHeader back={goBack} brand eyebrow={`PERFIL PROFESIONAL · PASO ${step} DE ${TOTAL_STEPS}`} title={title} subtitle={description}>
          <View style={styles.progressBlock}>
            <View style={styles.progressCopy}>
              <Text style={styles.progressLabel}>Tu progreso</Text>
              <Text style={styles.progressValue}><Text style={styles.progressStrong}>{step}</Text>/{TOTAL_STEPS} · {Math.round((step / TOTAL_STEPS) * 100)}%</Text>
            </View>
            <View accessibilityLabel={`Paso ${step} de ${TOTAL_STEPS}`} style={styles.progressSegments}>
              {Array.from({ length: TOTAL_STEPS }, (_, index) => <View key={index} style={[styles.segment, index < step && styles.segmentActive]} />)}
            </View>
          </View>
        </MarketplaceHeader>
      )}
    >
      <View style={styles.content}>{children}</View>
      {onNext ? (
        <View style={styles.actions}>
          <PillButton label={nextLabel} size="lg" chevron loading={nextLoading} disabled={nextDisabled} onPress={onNext} />
          <PillButton label={step === 1 ? 'Volver al inicio' : 'Volver'} variant="outline" onPress={goBack} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 20, paddingTop: 20 },
  progressBlock: { gap: 10 },
  progressCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  progressLabel: { color: ui.headerMuted, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  progressValue: { color: ui.headerMuted, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  progressStrong: { color: ui.white, fontWeight: '800' },
  progressSegments: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.35)' },
  segmentActive: { backgroundColor: ui.accent },
  content: { gap: 16 },
  actions: { gap: 10, paddingTop: 4 },
});
