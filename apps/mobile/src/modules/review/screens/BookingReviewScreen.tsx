import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
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
      {state.kind === 'loading' ? <ActivityIndicator accessibilityRole="progressbar" color={colors.primary} /> : null}
      {state.kind === 'unavailable' ? <ErrorMessage>La contratación no está disponible.</ErrorMessage> : null}
      {state.kind === 'error' ? <ErrorMessage>{state.message}</ErrorMessage> : null}
      {state.kind === 'ready' ? (
        <>
          <View style={styles.context}>
            <Text style={styles.title}>{state.booking.service_title}</Text>
            <Text style={styles.meta}>Profesional: {state.booking.worker_display_name}</Text>
            <Text style={styles.meta}>{formatBookingAmount(state.booking.agreed_price_bob)} · {formatBookingDateTime(state.booking.completed_at ?? state.booking.scheduled_at)}</Text>
          </View>
          {state.review ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tu reseña</Text>
              <FeedbackMessage tone="success">La reseña fue enviada y es de solo lectura.</FeedbackMessage>
              <ReviewCard review={state.review} />
              <AppButton label="Volver al trabajo" variant="secondary" onPress={() => router.replace({ pathname: '/(app)/booking/[bookingId]', params: { bookingId } } as never)} />
            </View>
          ) : eligible ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tu calificación</Text>
              <RatingPicker value={rating} onChange={setRating} />
              {!validation.ok && rating !== null ? <ErrorMessage>{validation.ratingError}</ErrorMessage> : null}
              <FormField label="Comentario opcional" value={comment} onChangeText={setComment} multiline placeholder="Cuenta cómo fue el servicio" />
              {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
              <AppButton label="Enviar reseña" icon="send" disabled={!validation.ok} loading={submitting} onPress={() => void submit()} />
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
      {[1, 2, 3, 4, 5].map((rating) => (
        <Pressable
          key={rating}
          accessibilityLabel={`${rating} ${rating === 1 ? 'estrella' : 'estrellas'}`}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === rating }}
          onPress={() => onChange(rating)}
          style={({ pressed }) => [styles.ratingButton, value === rating && styles.ratingSelected, pressed && styles.ratingPressed]}
        >
          <Text style={[styles.ratingText, value === rating && styles.ratingTextSelected]}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  context: { gap: spacing.xs, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  title: { color: colors.navy, ...typography.title },
  meta: { color: colors.textSecondary, ...typography.body },
  section: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  sectionTitle: { color: colors.navy, ...typography.section },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  ratingButton: { minWidth: sizing.touchTarget, minHeight: sizing.touchTarget, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.md, backgroundColor: colors.surface },
  ratingSelected: { borderColor: colors.warning, backgroundColor: colors.warningSoft },
  ratingPressed: { opacity: 0.75 },
  ratingText: { color: colors.textSecondary, fontSize: 26, lineHeight: 32 },
  ratingTextSelected: { color: colors.warning },
});
