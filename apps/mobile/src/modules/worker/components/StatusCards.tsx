import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { IconBubble } from '@/components/ui/Kit';
import { shadows, ui, uiRadii } from '@/constants/theme';

/** "Mi trabajo" shortcut card: solid accent circle, label and chevron (no invented counts). */
export function StatusShortcutCard({ icon, label, hint, onPress }: { icon: IconName; label: string; hint: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
    >
      <View style={styles.shortcutTop}>
        <IconBubble name={icon} size={46} />
        <Icon color={ui.ink} name="chevron-right" size={20} />
      </View>
      <View style={styles.shortcutCopy}>
        <Text numberOfLines={1} style={styles.shortcutLabel}>{label}</Text>
        <Text numberOfLines={2} style={styles.shortcutHint}>{hint}</Text>
      </View>
    </Pressable>
  );
}

/** Compact "Accesos rápidos" card. Without `onPress` it renders as a read-only summary (no chevron). */
export function StatusQuickAccess({ icon, title, detail, onPress }: { icon: IconName; title: string; detail: string; onPress?: () => void }) {
  const content = (
    <>
      <View style={styles.shortcutTop}>
        <IconBubble name={icon} shape="square" size={36} iconSize={20} />
        {onPress ? <Icon color={ui.ink} name="chevron-right" size={18} /> : null}
      </View>
      <View style={styles.quickCopy}>
        <Text numberOfLines={1} style={styles.quickTitle}>{title}</Text>
        <Text numberOfLines={2} style={styles.quickDetail}>{detail}</Text>
      </View>
    </>
  );
  if (!onPress) {
    return <View accessible accessibilityLabel={`${title}. ${detail}`} style={styles.quick}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityHint={detail}
      accessibilityLabel={`Editar ${title.toLowerCase()}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quick, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

/** White card with a section heading, used for the read-only professional details. */
export function StatusSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** Detail line inside a `StatusSection`: soft icon bubble, title and optional meta. */
export function StatusDetailRow({ icon, title, meta }: { icon: IconName; title: string; meta?: string }) {
  return (
    <View style={styles.detailRow}>
      <IconBubble name={icon} size={40} iconSize={20} variant="soft" />
      <View style={styles.detailCopy}>
        <Text style={styles.detailTitle}>{title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
    </View>
  );
}

export const statusTextStyles = StyleSheet.create({
  meta: { color: ui.muted, fontSize: 14, lineHeight: 20 },
  body: { color: ui.inkSoft, fontSize: 15, lineHeight: 22 },
});

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  shortcut: { flex: 1, minHeight: 128, gap: 10, padding: 12, borderRadius: uiRadii.xl, backgroundColor: ui.card, ...shadows.card },
  shortcutTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shortcutCopy: { flex: 1, gap: 2 },
  shortcutLabel: { color: ui.ink, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  shortcutHint: { color: ui.inkSoft, fontSize: 12, lineHeight: 16 },
  quick: { flex: 1, minHeight: 64, gap: 8, paddingHorizontal: 10, paddingVertical: 10, borderRadius: uiRadii.lg, backgroundColor: ui.card, ...shadows.card },
  quickCopy: { flex: 1, gap: 1 },
  quickTitle: { color: ui.ink, fontSize: 12.5, lineHeight: 16, fontWeight: '700' },
  quickDetail: { color: ui.muted, fontSize: 11, lineHeight: 14 },
  section: { gap: 12, padding: 16, borderRadius: uiRadii.xl, backgroundColor: ui.card, ...shadows.card },
  sectionTitle: { color: ui.ink, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  detailRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: ui.divider },
  detailCopy: { flex: 1, gap: 2 },
  detailTitle: { color: ui.ink, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  meta: { color: ui.muted, fontSize: 14, lineHeight: 20 },
});
