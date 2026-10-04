import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { bookingFailureMessage } from '@/modules/booking/booking-errors';
import {
  availableBookingAction,
  bookingHistoryActorLabels,
  bookingStatusLabels,
  formatBookingAmount,
  formatBookingDateTime,
  normalizeBookingId,
} from '@/modules/booking/booking-model';
import { getMyBooking, transitionBooking } from '@/modules/booking/booking-service';
import type { BookingAction, BookingDetail, BookingStatus } from '@/modules/booking/types';
import { ReviewCard } from '@/modules/review/components/ReviewCard';
import { canCreateBookingReview } from '@/modules/review/review-model';
import { getMyBookingReview } from '@/modules/review/review-service';
import type { BookingReview } from '@/modules/review/types';

type DetailState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; detail: BookingDetail; review: BookingReview | null };

export function BookingDetailScreen({ bookingIdParam }: { bookingIdParam: string | string[] | undefined }) {
  const bookingId = normalizeBookingId(bookingIdParam);
  const [state, setState] = useState<DetailState>(bookingId ? { kind: 'loading' } : { kind: 'unavailable' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!bookingId) return;
    let current = true;
    void Promise.all([getMyBooking(bookingId), getMyBookingReview(bookingId)])
      .then(([detail, review]) => {
        if (current) setState(detail ? { kind: 'ready', detail, review } : { kind: 'unavailable' });
      })
      .catch((cause) => {
        if (current) setState({ kind: 'error', message: bookingFailureMessage(cause) });
      });
    return () => { current = false; };
  }, [attempt, bookingId]);

  return (
    <Screen
      contentStyle={styles.screen}
      footer={<MarketplaceNav active="requests" />}
      header={<MarketplaceHeader back={() => router.back()} eyebrow="TRABAJO" title="Detalle de contratación" subtitle="Seguimiento seguro del servicio acordado." />}
    >
      {state.kind === 'loading' ? (
        <View accessibilityRole="progressbar" style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Cargando trabajo…</Text>
        </View>
      ) : null}
      {state.kind === 'unavailable' ? <UnavailableBooking /> : null}
      {state.kind === 'error' ? (
        <View style={styles.state}>
          <ErrorMessage>{state.message}</ErrorMessage>
          <AppButton label="Reintentar" onPress={() => { setState({ kind: 'loading' }); setAttempt((value) => value + 1); }} />
        </View>
      ) : null}
      {state.kind === 'ready' ? (
        <ReadyBooking detail={state.detail} review={state.review} onChanged={() => setAttempt((value) => value + 1)} />
      ) : null}
    </Screen>
  );
}

function UnavailableBooking() {
  return (
    <View style={styles.state}>
      <Text style={styles.title}>Trabajo no disponible</Text>
      <Text style={styles.muted}>No existe o no participas en esta contratación.</Text>
      <AppButton label="Volver a mis trabajos" variant="secondary" onPress={() => router.replace('/(app)/bookings' as never)} />
    </View>
  );
}

function ReadyBooking({ detail, review, onChanged }: { detail: BookingDetail; review: BookingReview | null; onChanged: () => void }) {
  const counterpart = detail.perspective === 'customer'
    ? detail.worker_display_name
    : detail.customer_display_name;
  return (
    <>
      <View style={styles.hero}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>{detail.service_title}</Text>
            <Text style={styles.counterpart}>
              {detail.perspective === 'customer' ? 'Profesional' : 'Cliente'}: {counterpart}
            </Text>
          </View>
          <StatusBadge label={bookingStatusLabels[detail.booking_status]} tone={statusTone(detail.booking_status)} />
        </View>
        <Text style={styles.price}>{formatBookingAmount(detail.agreed_price_bob)}</Text>
        <Text style={styles.schedule}>Programado: {formatBookingDateTime(detail.scheduled_at)}</Text>
      </View>

      <DetailSection title="Trabajo acordado">
        <DetailRow label="Descripción de la solicitud" value={detail.job_description} />
        <DetailRow label="Zona" value={detail.job_area_label} />
        <DetailRow label="Dirección exacta privada" value={detail.address_text ?? 'No indicada'} />
        <DetailRow label="Coordenadas privadas" value={`${detail.exact_latitude.toFixed(5)}, ${detail.exact_longitude.toFixed(5)}`} />
      </DetailSection>

      <DetailSection title="Estado del servicio">
        <DetailRow label="Inicio real" value={detail.started_at ? formatBookingDateTime(detail.started_at) : 'Pendiente'} />
        <DetailRow label="Finalización solicitada" value={detail.completion_requested_at ? formatBookingDateTime(detail.completion_requested_at) : 'Pendiente'} />
        <DetailRow label="Finalización confirmada" value={detail.completed_at ? formatBookingDateTime(detail.completed_at) : 'Pendiente'} />
        <LifecycleAction detail={detail} onChanged={onChanged} />
      </DetailSection>

      <DetailSection title="Historial">
        {detail.status_history.map((item, index) => (
          <View key={`${item.created_at}-${index}`} style={styles.historyItem}>
            <View style={styles.historyMarker} />
            <View style={styles.historyCopy}>
              <Text style={styles.historyTitle}>{bookingStatusLabels[item.new_status]}</Text>
              <Text style={styles.meta}>{bookingHistoryActorLabels[item.changed_by_role]} · {formatBookingDateTime(item.created_at)}</Text>
            </View>
          </View>
        ))}
      </DetailSection>

      {review ? (
        <DetailSection title="Reseña del servicio">
          <ReviewCard review={review} />
          <FeedbackMessage tone="info">La reseña enviada es de solo lectura.</FeedbackMessage>
        </DetailSection>
      ) : canCreateBookingReview(detail.perspective, detail.booking_status, review) ? (
        <DetailSection title="Reseña del servicio">
          <Text style={styles.value}>Tu experiencia ayuda a construir una reputación real del profesional.</Text>
          <AppButton
            label="Calificar servicio"
            icon="edit"
            onPress={() => router.push({ pathname: '/(app)/booking/[bookingId]/review', params: { bookingId: detail.booking_id } } as never)}
          />
        </DetailSection>
      ) : null}
    </>
  );
}

function LifecycleAction({ detail, onChanged }: { detail: BookingDetail; onChanged: () => void }) {
  const action = availableBookingAction(detail.perspective, detail.booking_status);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const submittingRef = useRef(false);

  if (!action) {
    const message = detail.booking_status === 'completed'
      ? 'El trabajo fue confirmado como completado. El historial permanece disponible en modo de solo lectura.'
      : detail.booking_status === 'cancelled'
        ? 'Esta contratación está cancelada y no admite acciones del ciclo principal.'
        : 'La siguiente acción corresponde al otro participante.';
    return <FeedbackMessage tone={detail.booking_status === 'completed' ? 'success' : 'info'}>{message}</FeedbackMessage>;
  }

  async function submit(currentAction: BookingAction) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFailure(null);
    try {
      await transitionBooking(detail.booking_id, currentAction);
      onChanged();
    } catch (cause) {
      setFailure(bookingFailureMessage(cause));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.action}>
      <FeedbackMessage tone="info">{actionHelp(action)}</FeedbackMessage>
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
      <AppButton label={actionLabel(action)} icon="check" loading={submitting} onPress={() => void submit(action)} />
    </View>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

function actionLabel(action: BookingAction) {
  if (action === 'start') return 'Iniciar trabajo';
  if (action === 'request_completion') return 'Marcar trabajo como finalizado';
  return 'Confirmar finalización';
}

function actionHelp(action: BookingAction) {
  if (action === 'start') return 'Confirma cuando hayas comenzado el trabajo acordado.';
  if (action === 'request_completion') return 'El cliente recibirá una solicitud para confirmar la finalización.';
  return 'Confirma únicamente cuando el trabajo acordado esté finalizado.';
}

function statusTone(status: BookingStatus): 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  return 'warning';
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  state: { minHeight: 260, gap: spacing.md, justifyContent: 'center', padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  muted: { color: colors.textSecondary, textAlign: 'center', ...typography.body },
  hero: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headingCopy: { flex: 1, gap: spacing.xs },
  title: { color: colors.navy, ...typography.title },
  counterpart: { color: colors.primary, ...typography.label },
  price: { color: colors.success, ...typography.title },
  schedule: { color: colors.text, ...typography.bodyStrong },
  section: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  sectionTitle: { color: colors.navy, ...typography.section },
  row: { gap: spacing.xs, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  label: { color: colors.textSecondary, ...typography.caption },
  value: { color: colors.text, ...typography.bodyStrong },
  action: { gap: spacing.md, paddingTop: spacing.sm },
  historyItem: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  historyMarker: { width: 10, height: 10, marginTop: 5, borderRadius: radii.pill, backgroundColor: colors.primary },
  historyCopy: { flex: 1, gap: spacing.xs },
  historyTitle: { color: colors.text, ...typography.bodyStrong },
  meta: { color: colors.textSecondary, ...typography.caption },
});
