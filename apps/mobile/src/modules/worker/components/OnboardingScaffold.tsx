import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { Screen } from '@/components/ui/Screen';
import { Title } from '@/components/ui/Typography';
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
    <Screen contentStyle={styles.screen}>
      <AppHeader variant="navigation" title="Perfil profesional" onBack={goBack} />
      <View style={styles.progressBlock}>
        <View style={styles.progressCopy}>
          <Text style={styles.progressLabel}>{step} de 6</Text>
          <Text style={styles.progressName}>{title}</Text>
        </View>
        <View accessibilityLabel={`Paso ${step} de 6`} style={styles.progressTrack}>
          <View style={[styles.progressValue, { width: `${(step / 6) * 100}%` }]} />
        </View>
      </View>
      <View style={styles.heading}>
        <Title>{title}</Title>
        <Text style={styles.description}>{description}</Text>
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
  screen: { gap: spacing.lg },
  progressBlock: { gap: spacing.sm },
  progressCopy: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  progressLabel: { color: colors.primary, ...typography.label },
  progressName: { flex: 1, textAlign: 'right', color: colors.textSecondary, ...typography.caption },
  progressTrack: { height: 5, overflow: 'hidden', backgroundColor: colors.border, borderRadius: radii.pill },
  progressValue: { height: '100%', backgroundColor: colors.green, borderRadius: radii.pill },
  heading: { gap: spacing.sm },
  description: { color: colors.textSecondary, ...typography.body },
  content: { gap: spacing.lg },
  actions: { gap: spacing.sm, paddingTop: spacing.sm },
});
