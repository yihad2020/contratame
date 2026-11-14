import { StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';

export type MenuItem = {
  key: string;
  title: string;
  description?: string;
  icon: AppIconName;
  onPress: () => void;
  tone?: 'default' | 'danger';
};

/** Grouped list of navigation rows, Android-settings style, with an optional overline label. */
export function MenuList({ label, items }: { label?: string; items: MenuItem[] }) {
  return (
    <View style={styles.section}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.group}>
        {items.map((item, index) => {
          const danger = item.tone === 'danger';
          return (
            <PressableScale
              key={item.key}
              accessibilityHint={item.description}
              accessibilityRole="button"
              onPress={item.onPress}
              pressedScale={0.985}
              style={[styles.row, index > 0 && styles.divider]}
            >
              <View style={[styles.iconBox, danger && styles.iconBoxDanger]}>
                <AppIcon name={item.icon} color={danger ? colors.danger : colors.primary} size={sizing.iconMd} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.title, danger && styles.titleDanger]}>{item.title}</Text>
                {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
              </View>
              {danger ? null : <AppIcon name="chevronRight" color={colors.textSecondary} size={sizing.iconSm} />}
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  label: { color: colors.textSecondary, ...typography.overline, letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: spacing.xs },
  group: { borderRadius: radii.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  iconBox: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  iconBoxDanger: { backgroundColor: colors.dangerSoft },
  copy: { flex: 1, gap: spacing.xxs },
  title: { color: colors.text, ...typography.label, fontWeight: '700' },
  titleDanger: { color: colors.danger },
  description: { color: colors.textSecondary, ...typography.caption },
});
