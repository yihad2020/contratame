import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon, glyphForText, type IconName } from '@/components/ui/Icon';
import { Card, IconBubble, SectionTitle, StatusPill } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { ui } from '@/constants/theme';
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
import { bookingStatusIcon, bookingStatusTone } from '@/modules/booking/screens/booking-status-ui';
import type { BookingAction, BookingDetail } from '@/modules/booking/types';
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
        <Card style={styles.state}>
          <View accessibilityRole="progressbar" style={styles.stateInner}>
            <ActivityIndicator color={ui.accent} />
            <Text style={styles.muted}>Cargando trabajo…</Text>
          </View>
        </Card>
      ) : null}
      {state.kind === 'unavailable' ? <UnavailableBooking /> : null}
      {state.kind === 'error' ? (
        <Card style={styles.state}>
          <ErrorMessage>{state.message}</ErrorMessage>
          <PillButton label="Reintentar" icon="refresh" onPress={() => { setState({ kind: 'loading' }); setAttempt((value) => value + 1); }} />
        </Card>
      ) : null}
      {state.kind === 'ready' ? (
        <ReadyBooking detail={state.detail} review={state.review} onChanged={() => setAttempt((value) => value + 1)} />
      ) : null}
    </Screen>
  );
}

function UnavailableBooking() {
  return (
    <Card style={styles.state}>
      <View style={styles.centered}><IconBubble name="briefcase" variant="soft" size={68} /></View>
      <Text style={[styles.title, styles.centerText]}>Trabajo no disponible</Text>
      <Text style={styles.muted}>No existe o no participas en esta contratación.</Text>
      <PillButton label="Volver a mis trabajos" variant="outline" onPress={() => router.replace('/(app)/bookings' as never)} />
    </Card>
  );
}

function ReadyBooking({ detail, review, onChanged }: { detail: BookingDetail; review: BookingReview | null; onChanged: () => void }) {
  const counterpart = detail.perspective === 'customer'
    ? detail.worker_display_name
    : detail.customer_display_name;
  return (
    <>
      <Card style={styles.hero}>
        <View style={styles.headingRow}>
          <IconBubble name={glyphForText(detail.service_title)} variant="soft" shape="square" size={64} iconSize={34} />
          <View style={styles.headingCopy}>
            <Text style={styles.title}>{detail.service_title}</Text>
            <StatusPill icon={bookingStatusIcon(detail.booking_status)} label={bookingStatusLabels[detail.booking_status]} tone={bookingStatusTone(detail.booking_status)} />
          </View>
        </View>
        <View style={styles.counterpartRow}>
          <Avatar name={counterpart} size={44} />
          <View style={styles.flex}>
            <Text style={styles.label}>{detail.perspective === 'customer' ? 'Profesional' : 'Cliente'}</Text>
            <Text numberOfLines={1} style={styles.counterpart}>{counterpart}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.metaRow}>
          <Icon color={ui.muted} name="calendar-month" size={22} />
          <Text style={styles.schedule}>Programado: {formatBookingDateTime(detail.scheduled_at)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Icon color={ui.muted} name="cash" size={22} />
          <Text style={styles.price}>{formatBookingAmount(detail.agreed_price_bob)}</Text>
        </View>
      </Card>

      <DetailSection title="Trabajo acordado">
        <DetailRow icon="text-box" label="Descripción de la solicitud" value={detail.job_description} />
        <DetailRow icon="map-marker" label="Zona" value={detail.job_area_label} />
        <DetailRow icon="home-map-marker" label="Dirección exacta privada" value={detail.address_text ?? 'No indicada'} />
        <DetailRow icon="crosshairs-gps" label="Coordenadas privadas" value={`${detail.exact_latitude.toFixed(5)}, ${detail.exact_longitude.toFixed(5)}`} />
      </DetailSection>

      <DetailSection title="Estado del servicio">
        <DetailRow icon="play-circle" label="Inicio real" value={detail.started_at ? formatBookingDateTime(detail.started_at) : 'Pendiente'} />
        <DetailRow icon="flag-checkered" label="Finalización solicitada" value={detail.completion_requested_at ? formatBookingDateTime(detail.completion_requested_at) : 'Pendiente'} />
        <DetailRow icon="check-decagram" label="Finalización confirmada" value={detail.completed_at ? formatBookingDateTime(detail.completed_at) : 'Pendiente'} />
        <LifecycleAction detail={detail} onChanged={onChanged} />
      </DetailSection>

      <DetailSection title="Historial">
        {detail.status_history.map((item, index) => (
          <View key={`${item.created_at}-${index}`} style={styles.historyItem}>
            <View style={styles.historyRail}>
              <View style={styles.historyMarker} />
              {index < detail.status_history.length - 1 ? <View style={styles.historyLine} /> : null}
            </View>
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
          <View style={styles.reviewInvite}>
            <IconBubble name="star" variant="soft" size={48} />
            <Text style={[styles.value, styles.flex]}>Tu experiencia ayuda a construir una reputación real del profesional.</Text>
          </View>
          <PillButton
            label="Calificar servicio"
            icon="pencil"
            onPress={() => router.push({ pathname: '/(app)/booking/[bookingId]/review', params: { bookingId: detail.booking_id } } as never)}
          />
        </DetailSection>
      ) : null}
      <PillButton
        icon="flag"
        label="Reportar esta contratación"
        variant="outline"
        onPress={() => router.push({ pathname: '/(app)/booking/[bookingId]/report', params: { bookingId: detail.booking_id } } as never)}
      />
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
      <PillButton label={actionLabel(action)} icon="check-circle" loading={submitting} onPress={() => void submit(action)} />
    </View>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionBlock}>
      <SectionTitle title={title} />
      <Card style={styles.section}>{children}</Card>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Icon color={ui.muted} name={icon} size={22} />
      <View style={styles.flex}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
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

const styles = StyleSheet.create({
  screen: { gap: 16, paddingTop: 20 },
  flex: { flex: 1 },
  state: { minHeight: 240, gap: 14, justifyContent: 'center', padding: 24 },
  stateInner: { alignItems: 'center', gap: 12 },
  centered: { alignSelf: 'center' },
  centerText: { textAlign: 'center' },
  muted: { color: ui.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
  hero: { gap: 14 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  headingCopy: { flex: 1, gap: 8 },
  title: { color: ui.ink, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  counterpartRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterpart: { color: ui.ink, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  divider: { height: 1, backgroundColor: ui.divider },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  price: { flex: 1, color: ui.greenText, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  schedule: { flex: 1, color: ui.inkSoft, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  sectionBlock: { gap: 8 },
  section: { gap: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  label: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  value: { color: ui.ink, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  action: { gap: 12, paddingTop: 4 },
  reviewInvite: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyItem: { flexDirection: 'row', gap: 12 },
  historyRail: { width: 12, alignItems: 'center' },
  historyMarker: { width: 12, height: 12, marginTop: 4, borderRadius: 6, backgroundColor: ui.accent },
  historyLine: { flex: 1, width: 2, marginTop: 4, marginBottom: -14, backgroundColor: ui.accentSoft },
  historyCopy: { flex: 1, gap: 2 },
  historyTitle: { color: ui.ink, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  meta: { color: ui.muted, fontSize: 13, lineHeight: 18 },
});
