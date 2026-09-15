import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

export function DisplayTitle({ children }: PropsWithChildren) {
  return <Text style={styles.display}>{children}</Text>;
}

export function Title({ children }: PropsWithChildren) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

export function Overline({ children }: PropsWithChildren) {
  return <Text style={styles.overline}>{children}</Text>;
}

export function ErrorMessage({ children }: PropsWithChildren) {
  return (
    <View accessibilityRole="alert" style={[styles.feedback, styles.errorBackground]}>
      <Text style={[styles.feedbackText, styles.errorText]}>{children}</Text>
    </View>
  );
}

export function FeedbackMessage({ children, tone = 'success' }: PropsWithChildren<{ tone?: 'success' | 'info' }>) {
  return (
    <View
      accessibilityRole="alert"
      style={[styles.feedback, tone === 'success' ? styles.successBackground : styles.infoBackground]}
    >
      <Text style={[styles.feedbackText, tone === 'success' ? styles.successText : styles.infoText]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  display: { color: colors.text, ...typography.display },
  title: { color: colors.text, ...typography.title },
  body: { color: colors.text, ...typography.body },
  muted: { color: colors.textSecondary },
  overline: { color: colors.primary, ...typography.overline },
  feedback: { borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  feedbackText: { ...typography.caption, fontWeight: '600' },
  errorBackground: { backgroundColor: colors.dangerSoft },
  errorText: { color: colors.danger },
  successBackground: { backgroundColor: colors.successSoft },
  successText: { color: colors.success },
  infoBackground: { backgroundColor: colors.primarySoft },
  infoText: { color: colors.primaryPressed },
});
