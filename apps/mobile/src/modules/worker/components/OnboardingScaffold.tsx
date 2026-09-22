import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing, typography } from '@/constants/theme';

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
    <Screen contentStyle={styles.screen} header={<MarketplaceHeader back={goBack} eyebrow={`PERFIL PROFESIONAL · PASO ${step} DE 6`} title={title} subtitle={description} />}>
      <View style={styles.progressBlock}>
        <View style={styles.progressCopy}>
          <Text style={styles.progressLabel}>Tu progreso</Text>
          <Text style={styles.progressName}>{Math.round((step / 6) * 100)}%</Text>
        </View>
        <View accessibilityLabel={`Paso ${step} de 6`} style={styles.progressSegments}>
          {Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.segment, index < step && styles.segmentActive]} />)}
        </View>
      </View>
      <View style={styles.content}>{children}</View>
      {onNext ? (
        <View style={styles.actions}>
          <AppButton label={nextLabel} loading={nextLoading} disabled={nextDisabled} onPress={onNext} />
          <AppButton label={step === 1 ? 'Volver al inicio' : 'Volver'} variant="ghost" onPress={goBack} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  progressBlock: { gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  progressCopy: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  progressLabel: { color: colors.navy, ...typography.label },
  progressName: { flex: 1, textAlign: 'right', color: colors.primary, ...typography.label },
  progressSegments: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: radii.pill },
  segmentActive: { backgroundColor: colors.green },
  content: { gap: spacing.md },
  actions: { gap: spacing.sm, paddingTop: spacing.sm },
});
