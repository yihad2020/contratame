import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { sizing, ui } from '@/constants/theme';

/** Legacy section header API, styled like the redesign's `SectionTitle` ("Título · Ver todas >"). */
export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.row}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <Icon color={ui.accent} name="chevron-right" size={22} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flexShrink: 1, color: ui.ink, fontSize: 21, lineHeight: 28, fontWeight: '700' },
  action: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 8 },
  actionLabel: { color: ui.accent, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.65 },
});
