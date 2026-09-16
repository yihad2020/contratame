import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

export function FormSection({ children, label, plain = false }: PropsWithChildren<{ label?: string; plain?: boolean }>) {
  return (
    <View style={styles.section}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.surface, plain && styles.plainSurface]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  label: { color: colors.textSecondary, ...typography.overline, letterSpacing: 0.8, textTransform: 'uppercase' },
  surface: {
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  plainSurface: { padding: 0, backgroundColor: colors.transparent, borderWidth: 0 },
});
