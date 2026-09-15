import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export function AppButton({ label, onPress, disabled = false, variant = 'primary' }: {
  label: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger';
}) {
  const palette = variant === 'primary' ? styles.primary : variant === 'danger' ? styles.danger : styles.secondary;
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.button, palette, (pressed || disabled) && styles.dimmed]}>
      {disabled ? <ActivityIndicator color={variant === 'secondary' ? colors.primary : colors.white} />
        : <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  primary: { backgroundColor: colors.primary }, danger: { backgroundColor: colors.danger },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  label: { color: colors.white, fontSize: 16, fontWeight: '700' }, secondaryLabel: { color: colors.primary }, dimmed: { opacity: 0.6 },
});
