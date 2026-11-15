import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';

type HeaderAction = { label: string; icon: AppIconName; onPress: () => void; badgeCount?: number | null };

/**
 * Dark header shared by every signed-in screen.
 * - `brand` (tab roots): wordmark + large editorial title.
 * - `back` (detail screens): compact back button + tighter title.
 */
export function MarketplaceHeader({ title, eyebrow, subtitle, back, action, brand = false, children }: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  back?: () => void;
  action?: HeaderAction;
  brand?: boolean;
  /** Optional content rendered inside the header, below the title (e.g. a search bar). */
  children?: ReactNode;
}) {
  const isRoot = !back;
  return (
    <View style={[styles.header, isRoot ? styles.headerRoot : styles.headerDetail]}>
      <StatusBar style="light" />
      {back || brand || action ? (
        <View style={styles.topRow}>
          {back ? <HeaderActionButton label="Volver" icon="back" onPress={back} /> : brand ? <Wordmark /> : <View />}
          {action ? <HeaderActionButton {...action} /> : null}
        </View>
      ) : null}
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={isRoot ? styles.titleRoot : styles.titleDetail}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function Wordmark() {
  return (
    <Text accessibilityLabel="Contrátame!" accessibilityRole="text" style={styles.wordmark}>
      Contrátame<Text style={styles.wordmarkAccent}>!</Text>
    </Text>
  );
}

function HeaderActionButton({ label, icon, onPress, badgeCount }: HeaderAction) {
  const hasBadge = typeof badgeCount === 'number' && badgeCount > 0;
  return (
    <PressableScale
      accessibilityLabel={hasBadge ? `${label}, ${badgeCount} sin leer` : label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}
    >
      <AppIcon name={icon} color={colors.white} size={sizing.iconMd} />
      {hasBadge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.navyDeep,
    paddingHorizontal: sizing.screenPadding,
    paddingTop: spacing.lg,
    borderBottomLeftRadius: radii.hero,
    borderBottomRightRadius: radii.hero,
  },
  headerRoot: { paddingBottom: spacing.xxl, gap: spacing.xl },
  headerDetail: { paddingBottom: spacing.xl, gap: spacing.lg },
  topRow: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { color: colors.white, fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.5 },
  wordmarkAccent: { color: colors.green },
  button: {
    width: sizing.touchTarget,
    height: sizing.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.onDarkSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onDarkBorder,
  },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.navyDeep },
  badgeText: { color: colors.navyDeep, fontSize: 10, lineHeight: 12, fontWeight: '800' },
  copy: { gap: spacing.sm },
  eyebrow: { color: colors.successOnDark, fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  titleRoot: { color: colors.white, ...typography.hero },
  titleDetail: { color: colors.white, fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: colors.textOnDarkMuted, ...typography.body },
});
