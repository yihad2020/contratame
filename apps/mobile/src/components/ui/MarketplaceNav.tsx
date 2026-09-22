import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { colors, sizing, spacing, typography } from '@/constants/theme';

export function MarketplaceNav({ active }: { active: 'home' | 'profile' }) {
  return (
    <View accessibilityRole="tablist" style={styles.nav}>
      <NavItem active={active === 'home'} label="Inicio" icon="home" onPress={() => router.replace('/(app)/home')} />
      <NavItem active={active === 'profile'} label="Mi perfil" icon="account" onPress={() => router.replace('/(app)/profile')} />
    </View>
  );
}

function NavItem({ active, label, icon, onPress }: { active: boolean; label: string; icon: 'home' | 'account'; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      <AppIcon name={icon} size={sizing.iconMd} color={active ? colors.primary : colors.textSecondary} />
      <Text style={[styles.label, active && styles.active]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: { minHeight: 68, flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.xl },
  item: { flex: 1, minHeight: 68, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  pressed: { backgroundColor: colors.surfaceMuted },
  label: { color: colors.textSecondary, ...typography.caption },
  active: { color: colors.primary, fontWeight: '700' },
});
