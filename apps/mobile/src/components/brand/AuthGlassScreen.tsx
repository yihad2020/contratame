import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BoliviaHeroSlideshow } from '@/components/brand/BoliviaHeroSlideshow';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';

export function AuthGlassScreen({ children, longForm = false }: PropsWithChildren<{ longForm?: boolean }>) {
  const isFocused = useIsFocused();

  return (
    <>
      {isFocused ? <StatusBar style="light" /> : null}
      <Screen
        background={<BoliviaHeroSlideshow />}
        contentStyle={[styles.content, longForm ? styles.longForm : styles.shortForm]}
      >
        <View style={styles.logoSurface}>
          <BrandLogo accessibilityLabel="Contrátame!, talento cerca de ti" width={longForm ? 180 : 220} />
        </View>
        <View style={[styles.card, longForm && styles.longCard]}>{children}</View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  shortForm: { justifyContent: 'center' },
  longForm: { justifyContent: 'flex-start' },
  logoSurface: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.authLogoSurface,
    borderColor: colors.authGlassBorder,
    borderWidth: 1,
    borderRadius: radii.xl,
  },
  card: {
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.authCard,
    borderColor: colors.authGlassBorder,
    borderWidth: 1,
    borderRadius: radii.xl,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  longCard: { padding: spacing.lg },
});
