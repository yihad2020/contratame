import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, sizing, spacing, typography } from '@/constants/theme';

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { color: colors.text, ...typography.section },
  action: { minHeight: sizing.touchTarget, justifyContent: 'center', paddingHorizontal: spacing.sm },
  actionLabel: { color: colors.primary, ...typography.label },
  pressed: { opacity: 0.65 },
});
