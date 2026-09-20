import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Title } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { useWorkerOnboarding } from '@/modules/worker/onboarding-context';

export function WorkerStatusScreen() {
  const { draft } = useWorkerOnboarding();
  if (!draft) return null;
  const status = draft.worker.approval_status;
  const editable = status === 'draft' || status === 'rejected';
  const copy = status === 'pending_approval'
    ? { title: 'Perfil enviado', body: 'Tu perfil está en revisión. Tus datos profesionales permanecen en solo lectura hasta que termine la evaluación.', badge: 'En revisión' }
    : status === 'approved'
      ? { title: 'Perfil profesional aprobado', body: 'Tu perfil fue aprobado. La experiencia pública del marketplace llegará en un módulo posterior.', badge: 'Aprobado' }
      : status === 'suspended'
        ? { title: 'Perfil profesional suspendido', body: 'Tu perfil no está visible y la información profesional no puede editarse desde este módulo.', badge: 'Suspendido' }
        : status === 'rejected'
          ? { title: 'Corrige tu perfil', body: 'Puedes editar el mismo perfil y volver a enviarlo. El envío anterior permanecerá en el historial.', badge: 'Requiere correcciones' }
          : { title: 'Continúa tu perfil', body: 'Tu borrador está guardado y puedes retomarlo cuando quieras.', badge: 'Borrador' };

  return (
    <Screen contentStyle={styles.screen}>
      <AppHeader variant="navigation" title="Perfil profesional" onBack={() => router.replace('/(app)/home')} />
      <View style={styles.hero}>
        <View style={styles.icon}><AppIcon name={status === 'approved' ? 'check' : status === 'suspended' ? 'lock' : 'briefcase'} size={34} color={status === 'approved' ? colors.success : colors.primary} /></View>
        <StatusBadge label={copy.badge} tone={status === 'approved' ? 'success' : status === 'rejected' || status === 'suspended' ? 'danger' : 'warning'} />
        <Title>{copy.title}</Title>
        <Text style={styles.body}>{copy.body}</Text>
      </View>
      {editable ? <AppButton label={status === 'rejected' ? 'Corregir mi perfil' : 'Continuar mi perfil'} onPress={() => router.replace('/(app)/worker-onboarding/step/1' as never)} /> : null}
      <AppButton label="Ir al inicio" variant={editable ? 'ghost' : 'secondary'} onPress={() => router.replace('/(app)/home')} />
      <Text style={styles.customerNote}>Puedes seguir usando Contrátame! como cliente con normalidad.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  hero: { alignItems: 'flex-start', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl },
  icon: { width: 60, height: 60, borderRadius: radii.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  body: { color: colors.textSecondary, ...typography.body },
  customerNote: { textAlign: 'center', color: colors.textSecondary, ...typography.caption, minHeight: sizing.touchTarget },
});
