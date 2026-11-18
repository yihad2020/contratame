import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { shadows, sizing, ui, uiRadii } from '@/constants/theme';

/** Quick filter chip of the Explore mockup: solid accent when selected, white with icon otherwise. */
export function ExploreChip({ label, icon, iconColor, selected = false, loading = false, accessibilityLabel, onPress }: {
  label: string;
  icon?: IconName;
  iconColor?: string;
  selected?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  onPress(): void;
}) {
  const foreground = selected ? ui.white : ui.ink;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected, busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
    >
      {loading ? <ActivityIndicator color={selected ? ui.white : ui.accent} size="small" /> : icon ? <Icon color={selected ? ui.white : iconColor ?? ui.ink} name={icon} size={18} /> : null}
      <Text numberOfLines={1} style={[styles.label, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: uiRadii.pill, backgroundColor: ui.card, ...shadows.card },
  selected: { backgroundColor: ui.accent },
  pressed: { opacity: 0.82 },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
});
