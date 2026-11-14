import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radii, sizing, spacing } from '@/constants/theme';

type NavKey = 'home' | 'explore' | 'requests' | 'chat' | 'profile';

const ITEMS: { key: NavKey; label: string; icon: AppIconName; href: string }[] = [
  { key: 'home', label: 'Inicio', icon: 'home', href: '/(app)/home' },
  { key: 'explore', label: 'Explorar', icon: 'search', href: '/(app)/explore' },
  { key: 'requests', label: 'Solicitudes', icon: 'requests', href: '/(app)/requests' },
  { key: 'chat', label: 'Chat', icon: 'chat', href: '/(app)/chats' },
  { key: 'profile', label: 'Mi perfil', icon: 'account', href: '/(app)/profile' },
];

/** Floating pill tab bar. Sits in the Screen footer, above the system navigation inset. */
export function MarketplaceNav({ active }: { active: NavKey }) {
  return (
    <View style={styles.dock}>
      <View accessibilityRole="tablist" style={styles.nav}>
        {ITEMS.map((item) => {
          const selected = item.key === active;
          return (
            <PressableScale
              key={item.key}
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              containerStyle={styles.itemBox}
              onPress={() => router.replace(item.href as never)}
              pressedScale={0.92}
              style={[styles.item, selected && styles.itemActive]}
            >
              <AppIcon name={item.icon} size={sizing.iconMd} color={selected ? colors.white : colors.textSecondary} />
              <Text numberOfLines={1} style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm, backgroundColor: colors.background },
  nav: {
    flexDirection: 'row',
    gap: spacing.xxs,
    padding: spacing.xs + 2,
    borderRadius: radii.xxl + 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemBox: { flex: 1 },
  item: { minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: spacing.xxs, borderRadius: radii.xl },
  itemActive: { backgroundColor: colors.navyDeep },
  label: { color: colors.textSecondary, fontSize: 11, lineHeight: 14, fontWeight: '600' },
  labelActive: { color: colors.white, fontWeight: '700' },
});
