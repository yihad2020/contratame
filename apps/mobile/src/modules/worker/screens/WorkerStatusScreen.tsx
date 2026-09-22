import { router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { useWorkerOnboarding } from '@/modules/worker/onboarding-context';
import { pricingLabels, weekdayLabels } from '@/modules/worker/types';

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

  const activeServices = draft.services.filter((service) => service.active);
  const activeAvailability = draft.availability.filter((range) => range.active);

  return (
    <Screen
      contentStyle={styles.screen}
      header={<MarketplaceHeader back={() => router.replace('/(app)/home')} eyebrow="MI TRABAJO" title="Perfil profesional" subtitle="Consulta el estado y los datos de tu perfil." />}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.icon}><AppIcon name={status === 'approved' ? 'check' : status === 'suspended' ? 'lock' : 'briefcase'} size={34} color={status === 'approved' ? colors.success : colors.primary} /></View>
          <StatusBadge label={copy.badge} tone={status === 'approved' ? 'success' : status === 'rejected' || status === 'suspended' ? 'danger' : 'warning'} />
        </View>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        {editable ? <AppButton label={status === 'rejected' ? 'Corregir mi perfil' : 'Continuar mi perfil'} onPress={() => router.replace('/(app)/worker-onboarding/step/1' as never)} /> : null}
      </View>
      {draft.worker.bio ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre mi trabajo</Text>
          <Text style={styles.body}>{draft.worker.bio}</Text>
          {draft.worker.years_experience !== null ? <Text style={styles.meta}>{draft.worker.years_experience} años de experiencia</Text> : null}
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Servicios y precios</Text>
        {activeServices.length ? activeServices.map((service) => (
          <View key={service.id} style={styles.detailRow}>
            <View style={styles.detailIcon}><AppIcon name="tools" size={sizing.iconSm} /></View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailTitle}>{service.title}</Text>
              <Text style={styles.meta}>{service.price_bob !== null ? `Bs ${service.price_bob} · ` : ''}{pricingLabels[service.pricing_type]}</Text>
            </View>
          </View>
        )) : <Text style={styles.meta}>Aún no agregaste servicios.</Text>}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zona de trabajo</Text>
        {draft.location ? (
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}><AppIcon name="location" size={sizing.iconSm} /></View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailTitle}>{draft.location.public_area_label}, {draft.location.city}</Text>
              <Text style={styles.meta}>Radio de servicio: {draft.location.service_radius_m / 1000} km · ubicación exacta privada</Text>
            </View>
          </View>
        ) : <Text style={styles.meta}>Aún no agregaste tu zona de trabajo.</Text>}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Disponibilidad</Text>
        {activeAvailability.length ? activeAvailability.map((range) => (
          <View key={range.id} style={styles.detailRow}>
            <View style={styles.detailIcon}><AppIcon name="time" size={sizing.iconSm} /></View>
            <Text style={styles.detailTitle}>{weekdayLabels[range.day_of_week]} · {range.start_time.slice(0, 5)}–{range.end_time.slice(0, 5)}</Text>
          </View>
        )) : <Text style={styles.meta}>Aún no agregaste horarios.</Text>}
      </View>
      {draft.portfolio.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trabajos realizados</Text>
          <View style={styles.portfolio}>{draft.portfolio.map((item) => (
            <View key={item.id} style={styles.portfolioItem}>
              {item.preview_url ? <Image source={{ uri: item.preview_url }} style={styles.portfolioImage} /> : <View style={styles.portfolioImage} />}
              <Text numberOfLines={2} style={styles.meta}>{item.title}</Text>
            </View>
          ))}</View>
        </View>
      ) : null}
      <AppButton label="Ir al inicio" variant="secondary" onPress={() => router.replace('/(app)/home')} />
      <Text style={styles.customerNote}>Puedes seguir usando Contrátame! como cliente con normalidad.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md, paddingTop: spacing.xl },
  hero: { alignItems: 'stretch', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { width: 60, height: 60, borderRadius: radii.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.navy, ...typography.title },
  body: { color: colors.textSecondary, ...typography.body },
  section: { gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl },
  sectionTitle: { color: colors.navy, ...typography.section },
  detailRow: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  detailIcon: { width: 34, height: 34, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  detailCopy: { flex: 1, gap: spacing.xs },
  detailTitle: { flex: 1, color: colors.text, ...typography.label },
  meta: { color: colors.textSecondary, ...typography.caption },
  portfolio: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  portfolioItem: { width: '47%', gap: spacing.xs },
  portfolioImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  customerNote: { textAlign: 'center', color: colors.textSecondary, ...typography.caption, minHeight: sizing.touchTarget },
});
