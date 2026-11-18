import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { ui } from '@/constants/theme';

type Variant = 'solid' | 'outline' | 'soft' | 'dark' | 'danger';

/** Rounded pill action used across the redesign ("Ver perfil", "Publicar solicitud", "Cerrar sesión"). */
export function PillButton({ label, onPress, icon, chevron = false, variant = 'solid', size = 'md', loading = false, disabled = false, style, accessibilityLabel }: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  chevron?: boolean;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const foreground = variant === 'outline' ? ui.accent : variant === 'soft' ? ui.ink : ui.white;
  const isDisabled = disabled || loading;
  const glyphSize = size === 'sm' ? 18 : 22;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[size], styles[variant], pressed && !isDisabled && styles.pressed, disabled && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator color={foreground} /> : (
        <View style={styles.content}>
          {icon ? <Icon color={foreground} name={icon} size={glyphSize} /> : null}
          <Text numberOfLines={1} style={[styles.label, size === 'sm' && styles.labelSm, size === 'lg' && styles.labelLg, { color: foreground }]}>{label}</Text>
          {chevron ? <Icon color={foreground} name="chevron-right" size={glyphSize} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingHorizontal: 20, borderWidth: 1.5, borderColor: 'transparent' },
  sm: { minHeight: 40, paddingHorizontal: 16 },
  md: { minHeight: 48 },
  lg: { minHeight: 56, paddingHorizontal: 24 },
  solid: { backgroundColor: ui.accent, borderColor: ui.accent },
  outline: { backgroundColor: ui.white, borderColor: ui.accent },
  soft: { backgroundColor: ui.tag, borderColor: ui.tag },
  dark: { backgroundColor: ui.navy, borderColor: ui.navy, borderRadius: 18 },
  danger: { backgroundColor: ui.danger, borderColor: ui.danger },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  labelSm: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  labelLg: { fontSize: 18, lineHeight: 24 },
});
