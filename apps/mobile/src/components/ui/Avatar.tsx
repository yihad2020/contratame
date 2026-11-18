import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { ui } from '@/constants/theme';

export function initialsOf(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
}

/**
 * Round avatar with the mockups' accent ring. Shows initials (the app does not store photos yet).
 * `badge` renders the bottom-right marker: `online` (green dot, used only for the signed-in user)
 * or `verified` (green check, used for certified professionals).
 */
export function Avatar({ name, size = 56, ring = true, badge }: { name?: string | null; size?: number; ring?: boolean; badge?: 'online' | 'verified' }) {
  const inner = ring ? size - 8 : size;
  const dot = Math.max(14, Math.round(size * 0.24));
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, styles.center, ring && [styles.ring, { borderRadius: size / 2 }]]}
    >
      <View style={[styles.inner, { width: inner, height: inner, borderRadius: inner / 2 }]}>
        <Text style={[styles.initials, { fontSize: Math.round(inner * 0.36) }]}>{initialsOf(name)}</Text>
      </View>
      {badge ? (
        <View style={[styles.badge, { width: dot, height: dot, borderRadius: dot / 2, right: size * 0.01, bottom: size * 0.01 }]}>
          {badge === 'verified' ? <Icon color={ui.white} name="check-bold" size={Math.round(dot * 0.6)} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 2, borderColor: ui.accent, backgroundColor: ui.white },
  inner: { alignItems: 'center', justifyContent: 'center', backgroundColor: ui.navySoft },
  initials: { color: ui.navy, fontWeight: '800' },
  badge: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: ui.green, borderWidth: 2.5, borderColor: ui.white },
});
