import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AppIcon } from '@/components/ui/AppIcon';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { ModeSwitch } from '@/modules/home/components/ModeSwitch';
import type { HomeMode } from '@/modules/home/home-model';

type HomeHeroProps = {
  greeting: string;
  initials: string;
  unreadNotifications: number | null;
  mode: HomeMode;
  title: string;
  subtitle?: string;
  onModeChange: (mode: HomeMode) => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  children?: ReactNode;
};

export function HomeHero({
  greeting,
  initials,
  unreadNotifications,
  mode,
  title,
  subtitle,
  onModeChange,
  onOpenProfile,
  onOpenNotifications,
  children,
}: HomeHeroProps) {
  const hasUnread = typeof unreadNotifications === 'number' && unreadNotifications > 0;
  return (
    <View style={styles.hero}>
      <StatusBar style="light" />
      <View style={styles.topRow}>
        <PressableScale
          accessibilityLabel="Abrir mi perfil"
          accessibilityRole="button"
          onPress={onOpenProfile}
          style={styles.identity}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text numberOfLines={1} style={styles.greeting}>{greeting}</Text>
            <Text style={styles.brandLine}>Contrátame!</Text>
          </View>
        </PressableScale>
        <PressableScale
          accessibilityLabel={hasUnread ? `Abrir notificaciones, ${unreadNotifications} sin leer` : 'Abrir notificaciones'}
          accessibilityRole="button"
          onPress={onOpenNotifications}
          style={styles.iconButton}
        >
          <AppIcon name="notifications" color={colors.white} size={sizing.iconMd} />
          {hasUnread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Text>
            </View>
          ) : null}
        </PressableScale>
      </View>

      <ModeSwitch value={mode} onChange={onModeChange} />

      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.navyDeep,
    paddingHorizontal: sizing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radii.hero,
    borderBottomRightRadius: radii.hero,
    gap: spacing.xl,
  },
  topRow: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: sizing.touchTarget, paddingRight: spacing.sm },
  avatar: { width: sizing.touchTarget, height: sizing.touchTarget, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 16, lineHeight: 20, fontWeight: '800', letterSpacing: -0.3 },
  identityCopy: { flexShrink: 1, gap: spacing.xxs },
  greeting: { color: colors.white, ...typography.bodyStrong, letterSpacing: -0.2 },
  brandLine: { color: colors.textOnDarkMuted, ...typography.caption },
  iconButton: {
    width: sizing.touchTarget,
    height: sizing.touchTarget,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.onDarkSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onDarkBorder,
  },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.navyDeep },
  badgeText: { color: colors.navyDeep, fontSize: 10, lineHeight: 12, fontWeight: '800' },
  copy: { gap: spacing.sm },
  title: { color: colors.white, ...typography.hero },
  subtitle: { color: colors.textOnDarkMuted, ...typography.body },
});
