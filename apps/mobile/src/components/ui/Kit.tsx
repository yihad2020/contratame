import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, categoryGlyph, type IconName } from '@/components/ui/Icon';
import { shadows, ui, uiRadii } from '@/constants/theme';

/** White rounded surface with the soft shadow used by every mockup card. */
export function Card({ children, style, onPress, accessibilityLabel }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }>) {
  if (onPress) {
    return (
      <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Section title row with the accent "Ver todas >" link. */
export function SectionTitle({ title, actionLabel, onAction, style }: { title: string; actionLabel?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction} style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}>
          <Text style={styles.sectionActionLabel}>{actionLabel}</Text>
          <Icon color={ui.accent} name="chevron-right" size={22} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Small grey tag ("Instalaciones", "Reparaciones"). */
export function Tag({ label, icon }: { label: string; icon?: IconName }) {
  return (
    <View style={styles.tag}>
      {icon ? <Icon color={ui.inkSoft} name={icon} size={14} /> : null}
      <Text numberOfLines={1} style={styles.tagLabel}>{label}</Text>
    </View>
  );
}

export type StatusTone = 'accent' | 'info' | 'success' | 'danger' | 'neutral';

const toneColors: Record<StatusTone, { bg: string; fg: string }> = {
  accent: { bg: ui.accentSoft, fg: ui.accent },
  info: { bg: ui.navySoft, fg: ui.navy },
  success: { bg: ui.greenSoft, fg: ui.greenText },
  danger: { bg: ui.dangerSoft, fg: ui.danger },
  neutral: { bg: ui.tag, fg: ui.muted },
};

/** Soft status pill with optional leading icon or dot ("Pendiente", "En proceso", "Disponible ahora"). */
export function StatusPill({ label, tone = 'accent', icon, dot = false }: { label: string; tone?: StatusTone; icon?: IconName; dot?: boolean }) {
  const tint = toneColors[tone];
  return (
    <View style={[styles.status, { backgroundColor: tint.bg }]}>
      {icon ? <Icon color={tint.fg} name={icon} size={18} /> : null}
      {dot ? <View style={[styles.statusDot, { backgroundColor: tone === 'success' ? ui.green : tint.fg }]} /> : null}
      <Text numberOfLines={1} style={[styles.statusLabel, { color: tint.fg }]}>{label}</Text>
    </View>
  );
}

/** Coloured circle / rounded square holding a glyph. */
export function IconBubble({ name, variant = 'solid', size = 48, iconSize, shape = 'circle', color }: {
  name: IconName;
  variant?: 'solid' | 'soft' | 'grey' | 'glass';
  size?: number;
  iconSize?: number;
  shape?: 'circle' | 'square';
  color?: string;
}) {
  const bg = variant === 'solid' ? ui.accent : variant === 'soft' ? ui.accentSoft : variant === 'grey' ? ui.tag : ui.headerButton;
  const fg = color ?? (variant === 'solid' || variant === 'glass' ? ui.white : variant === 'soft' ? ui.accent : ui.ink);
  return (
    <View style={[styles.center, { width: size, height: size, borderRadius: shape === 'circle' ? size / 2 : Math.round(size * 0.3), backgroundColor: bg }]}>
      <Icon color={fg} name={name} size={iconSize ?? Math.round(size * 0.5)} />
    </View>
  );
}

/** Square category tile (icon + label) from the Inicio / Nueva solicitud mockups. */
export function CategoryTile({ label, iconKey, slug, selected = false, onPress, width }: {
  label: string;
  iconKey?: string | null;
  slug?: string | null;
  selected?: boolean;
  onPress: () => void;
  width?: number;
}) {
  const glyph = categoryGlyph(iconKey, slug);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, width ? { width } : null, selected && styles.tileSelected, pressed && styles.pressed]}
    >
      <Icon color={glyph.color} name={glyph.name} size={38} />
      <Text numberOfLines={1} style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

/** Segmented step progress ("2/4" + bars) used in the Nueva solicitud header. */
export function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <View accessibilityLabel={`Paso ${current} de ${total}`} style={styles.progress}>
      <Text style={styles.progressLabel}><Text style={styles.progressStrong}>{current}</Text>/{total}</Text>
      <View style={styles.progressBars}>
        {Array.from({ length: total }, (_, index) => <View key={index} style={[styles.progressBar, index < current && styles.progressBarActive]} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: ui.card, borderRadius: uiRadii.xl, padding: 16, ...shadows.card },
  pressed: { opacity: 0.85 },
  center: { alignItems: 'center', justifyContent: 'center' },
  sectionRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { flexShrink: 1, color: ui.ink, fontSize: 21, lineHeight: 28, fontWeight: '700' },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 40 },
  sectionActionLabel: { color: ui.accent, fontSize: 15, fontWeight: '600' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: ui.tag, maxWidth: '100%' },
  tagLabel: { color: ui.inkSoft, fontSize: 12, lineHeight: 16 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start' },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusLabel: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  tile: { flex: 1, minWidth: 60, minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 2, paddingVertical: 12, borderRadius: uiRadii.lg, backgroundColor: ui.card, borderWidth: 2, borderColor: 'transparent', ...shadows.card },
  tileSelected: { borderColor: ui.accent, backgroundColor: ui.accentTint },
  tileLabel: { color: ui.ink, fontSize: 11.5, lineHeight: 15, fontWeight: '500', textAlign: 'center', letterSpacing: -0.1 },
  progress: { alignItems: 'flex-end', gap: 8 },
  progressLabel: { color: ui.headerMuted, fontSize: 18, fontWeight: '600' },
  progressStrong: { color: ui.white, fontWeight: '800' },
  progressBars: { flexDirection: 'row', gap: 5 },
  progressBar: { width: 22, height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.35)' },
  progressBarActive: { backgroundColor: ui.accent },
});
