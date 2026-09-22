import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';

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
  const iconColor = accent === 'green' ? colors.success : colors.primary;
  const iconBackground = accent === 'green' ? colors.greenSoft : colors.primarySoft;

  return (
    <Pressable
      accessibilityHint="Abre información sobre esta opción"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBackground }]}>
        <AppIcon name={icon} color={iconColor} size={sizing.iconLg} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <AppIcon name="chevronRight" color={colors.textSecondary} size={sizing.iconSm} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  pressed: { backgroundColor: colors.surfaceMuted, borderColor: colors.borderStrong },
  iconBox: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: spacing.xs },
  title: { color: colors.text, ...typography.bodyStrong },
  description: { color: colors.textSecondary, ...typography.caption },
});
