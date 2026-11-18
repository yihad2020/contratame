import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { ui, uiRadii } from '@/constants/theme';

export function InlineChoice<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange(value: T): void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}
          >
            {selected ? <Icon color={ui.accent} name="check-circle" size={18} /> : null}
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    backgroundColor: ui.tag,
    borderWidth: 1.5,
    borderColor: ui.tag,
    borderRadius: uiRadii.pill,
  },
  selected: { backgroundColor: ui.accentTint, borderColor: ui.accent },
  pressed: { opacity: 0.8 },
  label: { color: ui.inkSoft, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  selectedLabel: { color: ui.accent, fontWeight: '700' },
});
