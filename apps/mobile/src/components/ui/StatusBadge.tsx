import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

export function StatusBadge({ label, tone = 'success' }: { label: string; tone?: 'success' | 'warning' | 'danger' }) {
  const backgroundStyle = tone === 'success'
    ? styles.successBackground
    : tone === 'warning' ? styles.warningBackground : styles.dangerBackground;
  const dotStyle = tone === 'success'
    ? styles.successDot
    : tone === 'warning' ? styles.warningDot : styles.dangerDot;
  const textStyle = tone === 'success'
    ? styles.successText
    : tone === 'warning' ? styles.warningText : styles.dangerText;

  return (
    <View style={[styles.badge, backgroundStyle]}>
      <View style={[styles.dot, dotStyle]} />
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill },
  dot: { width: 7, height: 7, borderRadius: radii.pill },
  label: { ...typography.caption, fontWeight: '700' },
  successBackground: { backgroundColor: colors.successSoft },
  successDot: { backgroundColor: colors.success },
  successText: { color: colors.success },
  warningBackground: { backgroundColor: colors.warningSoft },
  warningDot: { backgroundColor: colors.warning },
  warningText: { color: colors.warning },
  dangerBackground: { backgroundColor: colors.dangerSoft },
  dangerDot: { backgroundColor: colors.danger },
  dangerText: { color: colors.danger },
});
