import type { BookingStatus } from '@/modules/booking/types';
import type { ServiceRequestPerspective } from '@/modules/service-request/types';
import type {
  BookingReview,
  PublicReview,
  PublicWorkerReputation,
  PublicWorkerReputationRpcRow,
  ReviewDraft,
  ReviewRating,
  ReviewValidation,
} from '@/modules/review/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeReviewComment(value: string): string | null {
  const normalized = value.trim().replace(/\s+/gu, ' ');
  return normalized || null;
}

export function validateReviewDraft(draft: ReviewDraft): ReviewValidation {
  if (!Number.isInteger(draft.rating) || draft.rating === null || draft.rating < 1 || draft.rating > 5) {
    return { ok: false, ratingError: 'Selecciona una calificación de 1 a 5 estrellas.' };
  }
  return {
    ok: true,
    rating: draft.rating as ReviewRating,
    comment: normalizeReviewComment(draft.comment),
  };
}

export function buildCreateReviewParams(bookingId: string, draft: ReviewDraft) {
  const cleanBookingId = bookingId.trim().toLowerCase();
  if (!UUID_PATTERN.test(cleanBookingId)) throw new Error('invalid booking id');
  const validation = validateReviewDraft(draft);
  if (!validation.ok) throw new Error('invalid review');
  return {
    p_booking_id: cleanBookingId,
    p_rating: validation.rating,
    p_comment: validation.comment,
  };
}

export function canCreateBookingReview(
  perspective: ServiceRequestPerspective,
  status: BookingStatus,
  review: BookingReview | null,
) {
  return perspective === 'customer' && status === 'completed' && review === null;
}

function normalizeRating(value: unknown): ReviewRating | null {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5
    ? rating as ReviewRating
    : null;
}

export function normalizeBookingReview(value: unknown): BookingReview | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const rating = normalizeRating(row.rating);
  if (typeof row.review_id !== 'string' || typeof row.booking_id !== 'string'
      || typeof row.created_at !== 'string' || rating === null) return null;
  return {
    review_id: row.review_id,
    booking_id: row.booking_id,
    rating,
    comment: typeof row.comment === 'string' ? row.comment : null,
    created_at: row.created_at,
  };
}

function normalizePublicReviews(value: unknown): PublicReview[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const row = candidate as Record<string, unknown>;
    const rating = normalizeRating(row.rating);
    if (typeof row.review_id !== 'string' || typeof row.created_at !== 'string' || rating === null) return [];
    return [{
      review_id: row.review_id,
      rating,
      comment: typeof row.comment === 'string' ? row.comment : null,
      created_at: row.created_at,
    }];
  }).sort((left, right) => right.created_at.localeCompare(left.created_at)
    || right.review_id.localeCompare(left.review_id));
}

export function normalizePublicWorkerReputation(
  row: PublicWorkerReputationRpcRow,
): PublicWorkerReputation {
  const average = row.average_rating === null ? null : Number(row.average_rating);
  return {
    worker_id: row.worker_id,
    average_rating: average !== null && Number.isFinite(average) ? average : null,
    review_count: Number(row.review_count) || 0,
    reviews: normalizePublicReviews(row.reviews),
  };
}

export function formatRating(rating: number) {
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
}

export function formatAverageRating(average: number | null, count: number) {
  if (average === null || count === 0) return 'No hay reseñas todavía.';
  const label = count === 1 ? 'reseña' : 'reseñas';
  return `${new Intl.NumberFormat('es-BO', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(average)} · ${count} ${label}`;
}

export function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeZone: 'America/La_Paz',
  }).format(new Date(value));
}
