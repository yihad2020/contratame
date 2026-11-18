import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import type { AppIconName } from '@/components/ui/AppIcon';
import { Icon, appIconGlyph, type IconName } from '@/components/ui/Icon';
import { Wordmark } from '@/components/ui/Wordmark';
import { sizing, ui, uiRadii } from '@/constants/theme';

type HeaderAction = { label: string; icon: AppIconName | IconName; onPress: () => void; badgeCount?: number | null };

type MarketplaceHeaderProps = {
  /** Large white page title ("Mis solicitudes", "Mi perfil"). */
  title?: string;
  /** Small line above the title. */
  eyebrow?: string;
  subtitle?: string;
  /** Back handler. With `brand`, renders the circular back button and centres the wordmark. */
  back?: () => void;
  /** Round glass action on the right (notifications bell, menu…). */
  action?: HeaderAction;
  /** Shows the white Contrátame! wordmark. */
  brand?: boolean;
  /** Compact bar: back arrow · centred title · action (Perfil profesional mockup). */
  barTitle?: string;
  /** Element aligned to the right of the title block (e.g. step progress). */
  trailing?: ReactNode;
  /** Extra content rendered inside the dark area (greeting, search, quick actions…). */
  children?: ReactNode;
  /** Card that straddles the bottom edge of the dark area. */
  overlap?: ReactNode;
  /** How much of `overlap` sits on top of the dark area. */
  overlapInset?: number;
};

function glyph(icon: AppIconName | IconName): IconName {
  return (appIconGlyph as Record<string, IconName>)[icon] ?? (icon as IconName);
}

/**
 * Dark brand header from the UI-03 mockups: rounded bottom corners, faint decorative shapes,
 * white wordmark, glass action buttons, large title and an optional overlapping card.
 */
export function MarketplaceHeader({ title, eyebrow, subtitle, back, action, brand = false, barTitle, trailing, children, overlap, overlapInset = 72 }: MarketplaceHeaderProps) {
  const { width } = useWindowDimensions();
  const frameWidth = Math.max(0, Math.min(width, sizing.screenMaxWidth) - sizing.screenPadding * 2);
  const hasCopy = Boolean(title || eyebrow || subtitle || trailing);

  let topRow: ReactNode;
  if (barTitle) {
    topRow = (
      <View style={styles.barRow}>
        {back ? <PlainButton label="Volver" icon="arrow-left" onPress={back} /> : <View style={styles.spacer} />}
        <Text accessibilityRole="header" numberOfLines={1} style={styles.barTitle}>{barTitle}</Text>
        {action ? <PlainButton label={action.label} icon={glyph(action.icon)} onPress={action.onPress} /> : <View style={styles.spacer} />}
      </View>
    );
  } else if (back && brand) {
    topRow = (
      <View style={styles.centerRow}>
        <GlassButton label="Volver" icon="arrow-left" onPress={back} />
        <View style={styles.centerLogo}><Wordmark width={150} /></View>
        {action ? <GlassButton {...action} icon={glyph(action.icon)} /> : <View style={styles.buttonSpacer} />}
      </View>
    );
  } else {
    topRow = (
      <View style={styles.topRow}>
        {back ? <GlassButton label="Volver" icon="arrow-left" onPress={back} /> : brand ? <Wordmark width={176} /> : <View />}
        {action ? <GlassButton {...action} icon={glyph(action.icon)} /> : null}
      </View>
    );
  }

  return (
    <View>
      <StatusBar style="light" />
      <View style={[styles.header, overlap ? { paddingBottom: overlapInset + 8 } : null]}>
        <View pointerEvents="none" style={styles.decorA} />
        <View pointerEvents="none" style={styles.decorB} />
        <View style={[styles.frame, { width: frameWidth }]}>
          {topRow}
          {hasCopy ? (
            <View style={styles.copyRow}>
              <View style={styles.copy}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                {title ? <Text accessibilityRole="header" style={styles.title}>{title}</Text> : null}
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
            </View>
          ) : null}
          {children}
        </View>
      </View>
      {overlap ? <View style={[styles.overlap, { width: frameWidth, marginTop: -overlapInset }]}>{overlap}</View> : null}
    </View>
  );
}

function GlassButton({ label, icon, onPress, badgeCount }: { label: string; icon: IconName; onPress: () => void; badgeCount?: number | null }) {
  const unread = typeof badgeCount === 'number' && badgeCount > 0;
  return (
    <Pressable
      accessibilityLabel={unread ? `${label}, ${badgeCount} sin leer` : label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon color={ui.white} name={icon} size={26} />
      {unread ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

function PlainButton({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" hitSlop={8} onPress={onPress} style={({ pressed }) => [styles.plain, pressed && styles.pressed]}>
      <Icon color={ui.white} name={icon} size={28} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    overflow: 'hidden',
    backgroundColor: ui.header,
    paddingTop: 12,
    paddingBottom: 22,
    borderBottomLeftRadius: uiRadii.xxl,
    borderBottomRightRadius: uiRadii.xxl,
  },
  decorA: { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -120, right: -110, borderWidth: 46, borderColor: ui.headerDecor },
  decorB: { position: 'absolute', width: 200, height: 200, borderRadius: 100, bottom: -90, right: -40, backgroundColor: ui.headerDecor },
  frame: { alignSelf: 'center', gap: 18 },
  topRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  centerRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  centerLogo: { flex: 1, alignItems: 'center' },
  barRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barTitle: { flex: 1, textAlign: 'center', color: ui.white, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  spacer: { width: 44 },
  plain: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  button: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: ui.headerButton },
  buttonSpacer: { width: 52, height: 52 },
  pressed: { opacity: 0.7 },
  badge: { position: 'absolute', top: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: ui.green, borderWidth: 2, borderColor: ui.header },
  copyRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  copy: { flex: 1, gap: 4 },
  trailing: { paddingBottom: 4 },
  eyebrow: { color: ui.headerMuted, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  title: { color: ui.headerText, fontSize: 30, lineHeight: 37, fontWeight: '800' },
  subtitle: { color: ui.headerMuted, fontSize: 16, lineHeight: 22 },
  overlap: { alignSelf: 'center' },
});
