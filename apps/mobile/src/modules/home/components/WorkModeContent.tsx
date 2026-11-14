import { StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import type { WorkerApprovalStatus } from '@/modules/worker/types';

type Shortcut = { title: string; description: string; icon: AppIconName; onPress: () => void };

const STEPS = [
  { title: 'Completa tu perfil', description: 'Servicios, disponibilidad, zona y portafolio. Es gratis.' },
  { title: 'Revisión administrativa', description: 'Un administrador revisa tu perfil sin costo.' },
  { title: 'Visible para clientes', description: 'Tras la aprobación apareces en Explorar y recibes solicitudes.' },
];

export function WorkModeContent({
  status,
  onOpenRequests,
  onOpenCertification,
}: {
  status: WorkerApprovalStatus | null;
  onOpenRequests: () => void;
  onOpenCertification: () => void;
}) {
  if (status === 'approved') {
    const shortcuts: Shortcut[] = [
      { title: 'Solicitudes recibidas', description: 'Revisa y responde solicitudes de clientes.', icon: 'requests', onPress: onOpenRequests },
      { title: 'Certificación', description: 'Consulta o solicita tu verificación profesional.', icon: 'check', onPress: onOpenCertification },
    ];
    return (
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>Tu actividad profesional</Text>
        <View style={styles.list}>
          {shortcuts.map((item, index) => (
            <PressableScale
              key={item.title}
              accessibilityRole="button"
              onPress={item.onPress}
              pressedScale={0.985}
              style={[styles.row, index > 0 && styles.rowDivider]}
            >
              <View style={styles.rowIcon}><AppIcon name={item.icon} color={colors.primary} size={sizing.iconMd} /></View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowDescription}>{item.description}</Text>
              </View>
              <AppIcon name="chevronRight" color={colors.textSecondary} size={sizing.iconSm} />
            </PressableScale>
          ))}
        </View>
      </View>
    );
  }

  const current = status === 'pending_approval' ? 1 : 0;
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>Cómo empezar a trabajar</Text>
      <View style={styles.list}>
        {STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <View key={step.title} style={[styles.row, index > 0 && styles.rowDivider]}>
              <View style={[styles.stepDot, done && styles.stepDone, active && styles.stepActive]}>
                {done
                  ? <AppIcon name="check" color={colors.white} size={sizing.iconSm} />
                  : <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{index + 1}</Text>}
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{step.title}</Text>
                <Text style={styles.rowDescription}>{step.description}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  heading: { color: colors.navy, ...typography.sectionTight },
  list: { borderRadius: radii.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  rowCopy: { flex: 1, gap: spacing.xxs },
  rowTitle: { color: colors.text, ...typography.label, fontWeight: '700' },
  rowDescription: { color: colors.textSecondary, ...typography.caption },
  stepDot: { width: 32, height: 32, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.borderStrong },
  stepActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  stepDone: { borderColor: colors.success, backgroundColor: colors.success },
  stepNumber: { color: colors.textSecondary, fontSize: 13, lineHeight: 16, fontWeight: '800' },
  stepNumberActive: { color: colors.primary },
});
