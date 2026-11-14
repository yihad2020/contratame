import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import type { WorkerPanel, WorkerPanelTone } from '@/modules/home/home-model';

const TONES: Record<Exclude<WorkerPanelTone, 'loading'>, { icon: AppIconName; color: string; tint: string }> = {
  error: { icon: 'error', color: colors.warningOnDark, tint: 'rgba(247, 181, 72, 0.16)' },
  attention: { icon: 'info', color: colors.warningOnDark, tint: 'rgba(247, 181, 72, 0.16)' },
  neutral: { icon: 'briefcase', color: colors.successOnDark, tint: 'rgba(76, 208, 125, 0.16)' },
  progress: { icon: 'time', color: colors.textOnDark, tint: colors.onDarkSurface },
  success: { icon: 'check', color: colors.successOnDark, tint: 'rgba(76, 208, 125, 0.16)' },
};

export function WorkerStatusPanel({ panel, onAction }: { panel: WorkerPanel; onAction: (kind: 'retry' | 'open') => void }) {
  const tone = panel.tone === 'loading' ? null : TONES[panel.tone];
  const action = panel.action;
  const primaryGreen = action?.kind === 'open' && panel.tone === 'neutral';

  return (
    <View accessibilityLiveRegion="polite" style={styles.panel}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: tone?.tint ?? colors.onDarkSurface }]}>
          {tone ? <AppIcon name={tone.icon} color={tone.color} size={sizing.iconMd} /> : <ActivityIndicator color={colors.white} />}
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{panel.title}</Text>
          <Text style={styles.description}>{panel.description}</Text>
        </View>
      </View>
      {action ? (
        <PressableScale
          accessibilityRole="button"
          onPress={() => onAction(action.kind)}
          style={[styles.button, primaryGreen && styles.buttonGreen]}
        >
          {action.kind === 'retry' ? <AppIcon name="refresh" color={colors.navyDeep} size={sizing.iconSm} /> : null}
          <Text style={styles.buttonLabel}>{action.label}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.xxl,
    backgroundColor: colors.onDarkSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onDarkBorder,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconBox: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: spacing.xs },
  title: { color: colors.white, ...typography.bodyStrong, letterSpacing: -0.2 },
  description: { color: colors.textOnDarkMuted, ...typography.caption },
  button: {
    minHeight: sizing.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
  },
  buttonGreen: { backgroundColor: colors.green },
  buttonLabel: { color: colors.navyDeep, ...typography.bodyStrong },
});
