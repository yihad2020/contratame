import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Card, IconBubble, SectionTitle, StatusPill, type StatusTone } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { StarRating } from '@/components/ui/StarRating';
import { ui, uiRadii } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';
import { getMyNotificationUnreadCount } from '@/modules/notification/notification-service';
import { getPublicWorkerReputation } from '@/modules/review/review-service';
import {
  StatusDetailRow,
  StatusQuickAccess,
  StatusSection,
  StatusShortcutCard,
  statusTextStyles,
} from '@/modules/worker/components/StatusCards';
import { useWorkerOnboarding } from '@/modules/worker/onboarding-context';
import { pricingLabels, weekdayLabels } from '@/modules/worker/types';

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function WorkerStatusScreen() {
  const { draft } = useWorkerOnboarding();
  const { profile } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);
  const [rating, setRating] = useState<{ value: number; count: number } | null>(null);
  const workerId = draft?.worker.id ?? null;
  const isApproved = draft?.worker.approval_status === 'approved';

  useFocusEffect(useCallback(() => {
    let active = true;
    void getMyNotificationUnreadCount()
      .then((count) => { if (active) setUnreadNotifications(count); })
      .catch(() => { if (active) setUnreadNotifications(null); });
    if (workerId && isApproved) {
      void getPublicWorkerReputation(workerId)
        .then((reputation) => {
          if (!active) return;
          const value = reputation?.average_rating ?? null;
          const count = reputation?.review_count ?? 0;
          setRating(value !== null && Number.isFinite(value) && count > 0 ? { value, count } : null);
        })
        .catch(() => { if (active) setRating(null); });
    } else {
      setRating(null);
    }
    return () => { active = false; };
  }, [isApproved, workerId]));

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
  const tone: StatusTone = status === 'approved' ? 'success' : status === 'rejected' || status === 'suspended' ? 'danger' : 'accent';
  const statusIcon = status === 'approved' ? 'check-circle' : status === 'suspended' ? 'lock' : 'briefcase';
  const statusIconColor = status === 'approved' ? ui.greenText : status === 'suspended' || status === 'rejected' ? ui.danger : ui.accent;

  const activeServices = draft.services.filter((service) => service.active);
  const activeAvailability = draft.availability.filter((range) => range.active);
  const categoryNames = Array.from(new Set(activeServices
    .map((service) => draft.categories.find((category) => category.id === service.category_id)?.name)
    .filter((name): name is string => Boolean(name))));
  const headline = categoryNames.length ? categoryNames.join(' · ') : 'Perfil profesional';
  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : null;
  const openStep = (step: 1 | 2 | 4 | 5) => router.replace(`/(app)/worker-onboarding/step/${step}` as never);

  const summary = (
    <Card style={styles.summary}>
      <Avatar badge="online" name={displayName} size={76} />
      <View style={styles.summaryCopy}>
        <View style={styles.greetingRow}>
          <Text numberOfLines={2} style={styles.greeting}>Hola, {profile?.first_name ?? 'profesional'}! 👋</Text>
          {isApproved ? (
            <PillButton
              accessibilityLabel="Ver mi perfil público"
              chevron
              label="Ver perfil"
              onPress={() => router.push({ pathname: '/(app)/worker/[workerId]', params: { workerId: draft.worker.id } } as never)}
              size="sm"
              style={styles.viewProfile}
              variant="outline"
            />
          ) : null}
        </View>
        <Text numberOfLines={2} style={styles.headline}>{headline}</Text>
        {rating ? <StarRating count={rating.count} countSuffix={rating.count === 1 ? 'reseña' : 'reseñas'} value={rating.value} /> : null}
        {draft.location ? (
          <View style={styles.locationRow}>
            <Icon color={ui.muted} name="map-marker" size={18} />
            <Text numberOfLines={1} style={styles.location}>{draft.location.public_area_label}, {draft.location.city}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );

  return (
    <Screen
      contentStyle={styles.screen}
      footer={<MarketplaceNav active="profile" />}
      header={<MarketplaceHeader
        action={{
          label: 'Abrir notificaciones',
          icon: 'notifications',
          badgeCount: unreadNotifications,
          onPress: () => router.push('/(app)/notifications' as never),
        }}
        back={() => router.replace('/(app)/home')}
        brand
        overlap={summary}
        overlapInset={64}
        subtitle="Gestiona tus solicitudes y haz crecer tu negocio"
        title="Mi trabajo"
      />}
    >
      <View style={styles.shortcuts}>
        <StatusShortcutCard hint="Enviadas y recibidas" icon="text-box" label="Solicitudes" onPress={() => router.push('/(app)/requests' as never)} />
        <StatusShortcutCard hint="Contratados" icon="briefcase" label="Trabajos" onPress={() => router.push('/(app)/bookings' as never)} />
        <StatusShortcutCard hint="Insignia opcional" icon="certificate" label="Certificación" onPress={() => router.push('/(app)/certification' as never)} />
      </View>

      <SectionTitle title="Estado de tu perfil" />
      <Card style={styles.statusCard}>
        <View style={styles.statusTop}>
          <IconBubble color={statusIconColor} name={statusIcon} size={56} variant="soft" />
          <StatusPill label={copy.badge} tone={tone} />
        </View>
        <Text style={styles.statusTitle}>{copy.title}</Text>
        <Text style={statusTextStyles.body}>{copy.body}</Text>
        {editable ? (
          <PillButton
            chevron
            label={status === 'rejected' ? 'Corregir mi perfil' : 'Continuar mi perfil'}
            onPress={() => openStep(1)}
            size="lg"
          />
        ) : null}
      </Card>
      {status === 'rejected' && draft.latestRejectionReason ? (
        <View style={styles.rejectionCard}>
          <View style={styles.rejectionHead}>
            <Icon color={ui.danger} name="alert-circle" size={20} />
            <Text style={styles.rejectionLabel}>MOTIVO DE LA REVISIÓN</Text>
          </View>
          <Text style={styles.rejectionText}>{draft.latestRejectionReason}</Text>
        </View>
      ) : null}

      <SectionTitle title="Accesos rápidos" />
      <View style={styles.quickRow}>
        <StatusQuickAccess
          detail={editable ? 'Edita lo que ofreces' : plural(activeServices.length, 'activo', 'activos')}
          icon="cog"
          onPress={editable ? () => openStep(2) : undefined}
          title="Mis servicios"
        />
        <StatusQuickAccess
          detail={editable ? 'Define tu horario' : plural(activeAvailability.length, 'horario', 'horarios')}
          icon="calendar-month"
          onPress={editable ? () => openStep(4) : undefined}
          title="Disponibilidad"
        />
        <StatusQuickAccess
          detail={editable ? 'Muestra tu trabajo' : plural(draft.portfolio.length, 'trabajo', 'trabajos')}
          icon="image"
          onPress={editable ? () => openStep(5) : undefined}
          title="Portafolio"
        />
      </View>

      {draft.worker.bio ? (
        <StatusSection title="Sobre mi trabajo">
          <Text style={statusTextStyles.body}>{draft.worker.bio}</Text>
          {draft.worker.years_experience !== null ? <Text style={statusTextStyles.meta}>{draft.worker.years_experience} años de experiencia</Text> : null}
        </StatusSection>
      ) : null}
      <StatusSection title="Servicios y precios">
        {activeServices.length ? activeServices.map((service) => (
          <StatusDetailRow
            key={service.id}
            icon="hammer-wrench"
            meta={`${service.price_bob !== null ? `Bs ${service.price_bob} · ` : ''}${pricingLabels[service.pricing_type]}`}
            title={service.title}
          />
        )) : <Text style={statusTextStyles.meta}>Aún no agregaste servicios.</Text>}
      </StatusSection>
      <StatusSection title="Zona de trabajo">
        {draft.location ? (
          <StatusDetailRow
            icon="map-marker"
            meta={`Radio de servicio: ${draft.location.service_radius_m / 1000} km · ubicación exacta privada`}
            title={`${draft.location.public_area_label}, ${draft.location.city}`}
          />
        ) : <Text style={statusTextStyles.meta}>Aún no agregaste tu zona de trabajo.</Text>}
      </StatusSection>
      <StatusSection title="Disponibilidad">
        {activeAvailability.length ? activeAvailability.map((range) => (
          <StatusDetailRow
            key={range.id}
            icon="clock-time-four"
            title={`${weekdayLabels[range.day_of_week]} · ${range.start_time.slice(0, 5)}–${range.end_time.slice(0, 5)}`}
          />
        )) : <Text style={statusTextStyles.meta}>Aún no agregaste horarios.</Text>}
      </StatusSection>
      {draft.portfolio.length ? (
        <StatusSection title="Trabajos realizados">
          <View style={styles.portfolio}>{draft.portfolio.map((item) => (
            <View key={item.id} style={styles.portfolioItem}>
              {item.preview_url ? <Image source={{ uri: item.preview_url }} style={styles.portfolioImage} /> : <View style={styles.portfolioImage} />}
              <Text numberOfLines={2} style={statusTextStyles.meta}>{item.title}</Text>
            </View>
          ))}</View>
        </StatusSection>
      ) : null}

      <PillButton icon="home" label="Ir al inicio" onPress={() => router.replace('/(app)/home')} size="lg" variant="soft" />
      <Text style={styles.customerNote}>Puedes seguir usando Contrátame! como cliente con normalidad.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14, paddingTop: 16 },
  summary: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 18 },
  summaryCopy: { flex: 1, gap: 6 },
  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  greeting: { flex: 1, color: ui.ink, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  viewProfile: { minHeight: 36, paddingHorizontal: 12 },
  headline: { color: ui.inkSoft, fontSize: 15, lineHeight: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { flex: 1, color: ui.muted, fontSize: 14, lineHeight: 19 },
  shortcuts: { flexDirection: 'row', gap: 10 },
  statusCard: { gap: 12 },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  statusTitle: { color: ui.ink, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  rejectionCard: { gap: 8, padding: 16, borderRadius: uiRadii.xl, backgroundColor: ui.dangerSoft, borderWidth: 1, borderColor: ui.danger },
  rejectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rejectionLabel: { color: ui.danger, fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.8 },
  rejectionText: { color: ui.ink, fontSize: 15, lineHeight: 22 },
  quickRow: { flexDirection: 'row', gap: 8 },
  portfolio: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  portfolioItem: { width: '47%', gap: 4 },
  portfolioImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: uiRadii.md, backgroundColor: ui.tag },
  customerNote: { minHeight: 44, textAlign: 'center', color: ui.muted, fontSize: 13, lineHeight: 18 },
});
