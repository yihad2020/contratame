import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppIconName } from '@/components/ui/AppIcon';
import { Icon, appIconGlyph } from '@/components/ui/Icon';
import { shadows, ui, uiRadii } from '@/constants/theme';

export function ChoiceCard({
  title,
  description,
  icon,
  accent = 'primary',
  onPress,
}: {
  title: string;
  description: string;
  icon: AppIconName;
  accent?: 'primary' | 'green';
  onPress: () => void;
}) {
  const iconColor = accent === 'green' ? ui.greenText : ui.accent;
  const iconBackground = accent === 'green' ? ui.greenSoft : ui.accentSoft;

  return (
    <Pressable
      accessibilityHint="Abre información sobre esta opción"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBackground }]}>
        <Icon name={appIconGlyph[icon]} color={iconColor} size={28} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Icon name="chevron-right" color={ui.accent} size={26} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: ui.card,
    borderRadius: uiRadii.xl,
    ...shadows.card,
  },
  pressed: { opacity: 0.85 },
  iconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 3 },
  title: { color: ui.ink, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  description: { color: ui.muted, fontSize: 14, lineHeight: 19 },
});
