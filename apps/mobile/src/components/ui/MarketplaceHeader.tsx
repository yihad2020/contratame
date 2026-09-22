import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';

type HeaderAction = { label: string; icon: AppIconName; onPress: () => void };

export function MarketplaceHeader({ title, eyebrow, subtitle, back, action, brand = false }: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  back?: () => void;
  action?: HeaderAction;
  brand?: boolean;
}) {
  return (
    <View style={styles.header}>
      <StatusBar style="light" />
      <View style={styles.topRow}>
        {back ? <HeaderActionButton label="Volver" icon="back" onPress={back} /> : brand ? <View style={styles.logo}><BrandLogo width={116} /></View> : <View />}
        {action ? <HeaderActionButton {...action} /> : back ? <View style={styles.buttonSpacer} /> : null}
      </View>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function HeaderActionButton({ label, icon, onPress }: HeaderAction) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
      <AppIcon name={icon} color={colors.white} size={sizing.iconMd} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.navyDeep, paddingHorizontal: sizing.screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.xxl, borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl, gap: spacing.xl },
  topRow: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { backgroundColor: colors.white, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.md },
  button: { width: sizing.touchTarget, height: sizing.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.navySoft },
  buttonPressed: { opacity: 0.7 },
  buttonSpacer: { width: sizing.touchTarget },
  copy: { gap: spacing.xs },
  eyebrow: { color: colors.textOnDarkMuted, ...typography.label },
  title: { color: colors.white, ...typography.display },
  subtitle: { color: colors.textOnDark, ...typography.label },
});
