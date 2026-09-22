import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';

type HeaderAction = { label: string; icon: AppIconName; onPress: () => void };

type AppHeaderProps =
  | { variant?: 'brand'; logoWidth?: number }
  | { variant: 'navigation'; title: string; onBack: () => void; action?: HeaderAction }
  | { variant: 'personalized'; greeting: string; name: string; action: HeaderAction };

export function AppHeader(props: AppHeaderProps) {
  if (props.variant === 'navigation') {
    return (
      <View style={styles.navigation}>
        <HeaderButton label="Volver" icon="back" onPress={props.onBack} />
        <Text numberOfLines={1} style={styles.navigationTitle}>{props.title}</Text>
        <View style={styles.navigationSide}>
          {props.action ? <HeaderButton {...props.action} /> : null}
        </View>
      </View>
    );
  }

  if (props.variant === 'personalized') {
    return (
      <View style={styles.personalized}>
        <BrandLogo width={116} />
        <View style={styles.personalizedRow}>
          <View style={styles.personalizedCopy}>
            <Text style={styles.greeting}>{props.greeting}</Text>
            <Text numberOfLines={1} style={styles.name}>{props.name}</Text>
          </View>
          <HeaderButton {...props.action} contained />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.brand}>
      <BrandLogo width={props.logoWidth ?? 136} />
    </View>
  );
}

function HeaderButton({ label, icon, onPress, contained = false }: HeaderAction & { contained?: boolean }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        contained && styles.buttonContained,
        pressed && styles.buttonPressed,
      ]}
    >
      <AppIcon name={icon} size={sizing.iconMd} color={contained ? colors.navy : colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: { minHeight: 40, justifyContent: 'center', marginBottom: spacing.lg },
  navigation: {
    minHeight: sizing.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  navigationSide: { width: sizing.touchTarget, alignItems: 'flex-end' },
  navigationTitle: { flex: 1, textAlign: 'center', color: colors.text, ...typography.section },
  personalized: { gap: spacing.md, marginBottom: spacing.lg },
  personalizedRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  personalizedCopy: { flex: 1, gap: spacing.xxs },
  greeting: { color: colors.textSecondary, ...typography.label },
  name: { color: colors.text, fontSize: 20, lineHeight: 25, fontWeight: '800' },
  button: {
    width: sizing.touchTarget,
    height: sizing.touchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContained: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonPressed: { backgroundColor: colors.primarySoft },
});
