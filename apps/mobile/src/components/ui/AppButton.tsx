import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  icon?: AppIconName;
};

export function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  icon,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const foreground = variant === 'primary' || variant === 'danger' ? colors.white : colors.primary;
  const variantStyle: Record<ButtonVariant, ViewStyle> = {
    primary: styles.primary,
    secondary: styles.secondary,
    ghost: styles.ghost,
    danger: styles.danger,
  };
  const pressedStyle: Record<ButtonVariant, ViewStyle> = {
    primary: styles.primaryPressed,
    secondary: styles.secondaryPressed,
    ghost: styles.ghostPressed,
    danger: styles.dangerPressed,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyle[variant],
        pressed && !isDisabled && pressedStyle[variant],
        disabled && variant === 'primary' && styles.primaryDisabled,
        disabled && variant !== 'primary' && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          {icon ? <AppIcon name={icon} size={sizing.iconSm} color={foreground} /> : null}
          <Text style={[styles.label, { color: foreground }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: sizing.buttonHeight,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { ...typography.bodyStrong },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed, borderColor: colors.primaryPressed },
  primaryDisabled: { backgroundColor: colors.primaryDisabled, borderColor: colors.primaryDisabled },
  secondary: { backgroundColor: colors.surface, borderColor: colors.primary },
  secondaryPressed: { backgroundColor: colors.primarySoft },
  ghost: { backgroundColor: colors.transparent, borderColor: colors.transparent },
  ghostPressed: { backgroundColor: colors.primarySoft },
  danger: { backgroundColor: colors.danger, borderColor: colors.danger },
  dangerPressed: { backgroundColor: colors.dangerPressed, borderColor: colors.dangerPressed },
  disabled: { opacity: 0.55 },
});
