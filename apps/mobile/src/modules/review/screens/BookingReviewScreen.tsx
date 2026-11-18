import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { FormField } from '@/components/ui/FormField';
import { Icon, glyphForText } from '@/components/ui/Icon';
import { Card, IconBubble, SectionTitle } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { ui, uiRadii } from '@/constants/theme';
import { formatBookingAmount, formatBookingDateTime, normalizeBookingId } from '@/modules/booking/booking-model';
import { getMyBooking } from '@/modules/booking/booking-service';
import type { BookingDetail } from '@/modules/booking/types';
import { ReviewCard } from '@/modules/review/components/ReviewCard';
import { reviewFailureMessage } from '@/modules/review/review-errors';
import { canCreateBookingReview, validateReviewDraft } from '@/modules/review/review-model';
import { createBookingReview, getMyBookingReview } from '@/modules/review/review-service';
import type { BookingReview } from '@/modules/review/types';

type State =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; booking: BookingDetail; review: BookingReview | null };

export function BookingReviewScreen({ bookingIdParam }: { bookingIdParam: string | string[] | undefined }) {
  const bookingId = normalizeBookingId(bookingIdParam);
  const [state, setState] = useState<State>(bookingId ? { kind: 'loading' } : { kind: 'unavailable' });
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!bookingId) return;
    let current = true;
    void Promise.all([getMyBooking(bookingId), getMyBookingReview(bookingId)])
      .then(([booking, review]) => {
        if (current) setState(booking ? { kind: 'ready', booking, review } : { kind: 'unavailable' });
      })
      .catch((cause) => {
        if (current) setState({ kind: 'error', message: reviewFailureMessage(cause) });
      });
    return () => { current = false; };
  }, [bookingId]);

  const validation = validateReviewDraft({ rating, comment });
  const eligible = state.kind === 'ready'
    && canCreateBookingReview(state.booking.perspective, state.booking.booking_status, state.review);

  async function submit() {
    if (!bookingId || state.kind !== 'ready' || !eligible || !validation.ok || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFailure(null);
    try {
      await createBookingReview(bookingId, { rating, comment });
      const review = await getMyBookingReview(bookingId);
      setState({ ...state, review });
    } catch (cause) {
      setFailure(reviewFailureMessage(cause));
      const review = await getMyBookingReview(bookingId).catch(() => null);
      if (review) setState({ ...state, review });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Screen
      contentStyle={styles.screen}
      footer={<MarketplaceNav active="requests" />}
      header={<MarketplaceHeader back={() => router.back()} eyebrow="RESEÑA" title="Calificar servicio" subtitle="Comparte tu experiencia después del trabajo." />}
    >
      {state.kind === 'loading' ? <Card style={styles.loading}><ActivityIndicator accessibilityRole="progressbar" color={ui.accent} /></Card> : null}
      {state.kind === 'unavailable' ? <ErrorMessage>La contratación no está disponible.</ErrorMessage> : null}
      {state.kind === 'error' ? <ErrorMessage>{state.message}</ErrorMessage> : null}
      {state.kind === 'ready' ? (
        <>
          <Card style={styles.context}>
            <IconBubble name={glyphForText(state.booking.service_title)} variant="soft" shape="square" size={60} iconSize={32} />
            <View style={styles.contextCopy}>
              <Text style={styles.title}>{state.booking.service_title}</Text>
              <View style={styles.workerRow}>
                <Avatar name={state.booking.worker_display_name} size={34} />
                <Text numberOfLines={1} style={styles.worker}>Profesional: {state.booking.worker_display_name}</Text>
              </View>
              <View style={styles.metaRow}>
                <Icon color={ui.muted} name="calendar-month" size={18} />
                <Text style={styles.meta}>{formatBookingAmount(state.booking.agreed_price_bob)} · {formatBookingDateTime(state.booking.completed_at ?? state.booking.scheduled_at)}</Text>
              </View>
            </View>
          </Card>
          {state.review ? (
            <View style={styles.block}>
              <SectionTitle title="Tu reseña" />
              <Card style={styles.section}>
                <FeedbackMessage tone="success">La reseña fue enviada y es de solo lectura.</FeedbackMessage>
                <ReviewCard review={state.review} />
                <PillButton label="Volver al trabajo" variant="outline" onPress={() => router.replace({ pathname: '/(app)/booking/[bookingId]', params: { bookingId } } as never)} />
              </Card>
            </View>
          ) : eligible ? (
            <View style={styles.block}>
              <SectionTitle title="Tu calificación" />
              <Card style={styles.section}>
                <RatingPicker value={rating} onChange={setRating} />
                {!validation.ok && rating !== null ? <ErrorMessage>{validation.ratingError}</ErrorMessage> : null}
                <FormField label="Comentario opcional" value={comment} onChangeText={setComment} multiline placeholder="Cuenta cómo fue el servicio" />
                {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
                <PillButton label="Enviar reseña" icon="send" disabled={!validation.ok} loading={submitting} onPress={() => void submit()} />
              </Card>
            </View>
          ) : (
            <FeedbackMessage tone="info">Solo el cliente puede reseñar una contratación completada.</FeedbackMessage>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function RatingPicker({ value, onChange }: { value: number | null; onChange: (rating: number) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((rating) => {
        const filled = value !== null && rating <= value;
        return (
          <Pressable
            key={rating}
            accessibilityLabel={`${rating} ${rating === 1 ? 'estrella' : 'estrellas'}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === rating }}
            onPress={() => onChange(rating)}
            style={({ pressed }) => [styles.ratingButton, value === rating && styles.ratingSelected, pressed && styles.ratingPressed]}
          >
            <Icon color={filled ? ui.accent : ui.subtle} name={filled ? 'star' : 'star-outline'} size={34} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16, paddingTop: 20 },
  loading: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  context: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  contextCopy: { flex: 1, gap: 8 },
  title: { color: ui.ink, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  worker: { flex: 1, color: ui.ink, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flex: 1, color: ui.muted, fontSize: 14, lineHeight: 19 },
  block: { gap: 8 },
  section: { gap: 16 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  ratingButton: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: uiRadii.lg, backgroundColor: ui.tag, borderWidth: 1.5, borderColor: 'transparent' },
  ratingSelected: { borderColor: ui.accent, backgroundColor: ui.accentSoft },
  ratingPressed: { opacity: 0.75 },
});
