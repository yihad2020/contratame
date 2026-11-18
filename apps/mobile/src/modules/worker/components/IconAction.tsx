import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { ui } from '@/constants/theme';

/** Round grey icon button used for edit/delete actions inside onboarding cards. */
export function IconAction({ label, icon, onPress, disabled = false, tone = 'default' }: {
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, tone === 'danger' && styles.danger, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Icon color={tone === 'danger' ? ui.danger : ui.inkSoft} name={icon} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: ui.tag },
  danger: { backgroundColor: ui.dangerSoft },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
});
