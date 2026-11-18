import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { shadows, ui, uiRadii } from '@/constants/theme';

type NavKey = 'home' | 'explore' | 'requests' | 'chat' | 'profile';

/** Bottom tab bar from the UI-03 mockups: filled icons, accent active state, rounded top. */
export function MarketplaceNav({ active, chatBadge = false }: { active: NavKey; chatBadge?: boolean }) {
  return (
    <View style={styles.backdrop}>
    <View accessibilityRole="tablist" style={styles.nav}>
      <NavItem active={active === 'home'} label="Inicio" icon="home" onPress={() => router.replace('/(app)/home')} />
      <NavItem active={active === 'explore'} label="Explorar" icon="magnify" onPress={() => router.replace('/(app)/explore' as never)} />
      <NavItem active={active === 'requests'} label="Solicitudes" icon="text-box" onPress={() => router.replace('/(app)/requests' as never)} />
      <NavItem active={active === 'chat'} badge={chatBadge} label="Mensajes" icon="message-processing" onPress={() => router.replace('/(app)/chats' as never)} />
      <NavItem active={active === 'profile'} label="Perfil" icon="account" onPress={() => router.replace('/(app)/profile')} />
    </View>
    </View>
  );
}

function NavItem({ active, label, icon, onPress, badge = false }: { active: boolean; label: string; icon: IconName; onPress: () => void; badge?: boolean }) {
  const color = active ? ui.accent : ui.subtle;
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      <View>
        <Icon color={active ? ui.accent : '#8C9198'} name={icon} size={30} />
        {badge ? <View style={styles.badge} /> : null}
      </View>
      <Text numberOfLines={1} style={[styles.label, { color }, active && styles.active]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: ui.page },
  nav: {
    minHeight: 76,
    flexDirection: 'row',
    backgroundColor: ui.card,
    borderTopLeftRadius: uiRadii.xxl,
    borderTopRightRadius: uiRadii.xxl,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 6,
    ...shadows.nav,
  },
  item: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 4 },
  pressed: { opacity: 0.7 },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '500' },
  active: { fontWeight: '700' },
  badge: { position: 'absolute', top: -2, right: -4, width: 11, height: 11, borderRadius: 6, backgroundColor: ui.accent, borderWidth: 2, borderColor: ui.card },
});
