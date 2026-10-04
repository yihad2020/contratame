import { reviewFailureMessage } from '@/modules/review/review-errors';
import {
  buildCreateReviewParams,
  canCreateBookingReview,
  formatAverageRating,
  formatRating,
  normalizeBookingReview,
  normalizePublicWorkerReputation,
  normalizeReviewComment,
  validateReviewDraft,
} from '@/modules/review/review-model';

const bookingId = '85000000-0000-4000-8000-000000000001';

describe('MOD-09 review model', () => {
  test('accepts exactly the frozen 1 to 5 rating scale', () => {
    expect(validateReviewDraft({ rating: 1, comment: '' }).ok).toBe(true);
    expect(validateReviewDraft({ rating: 5, comment: '' }).ok).toBe(true);
    expect(validateReviewDraft({ rating: 0, comment: '' }).ok).toBe(false);
    expect(validateReviewDraft({ rating: 6, comment: '' }).ok).toBe(false);
    expect(validateReviewDraft({ rating: 2.5, comment: '' }).ok).toBe(false);
    expect(validateReviewDraft({ rating: null, comment: '' }).ok).toBe(false);
  });

  test('normalizes whitespace without inventing a comment length limit', () => {
    expect(normalizeReviewComment('  Muy\n  buen\ttrabajo  ')).toBe('Muy buen trabajo');
    expect(normalizeReviewComment('   ')).toBeNull();
    const longComment = `Excelente ${'trabajo '.repeat(300)}`;
    expect(normalizeReviewComment(longComment)?.endsWith('trabajo')).toBe(true);
  });

  test('builds a narrow payload without customer worker or booking state', () => {
    const params = buildCreateReviewParams(bookingId, { rating: 5, comment: '  Excelente  ' });
    expect(params).toEqual({ p_booking_id: bookingId, p_rating: 5, p_comment: 'Excelente' });
    expect(params).not.toHaveProperty('customer_id');
    expect(params).not.toHaveProperty('worker_id');
    expect(params).not.toHaveProperty('booking_status');
  });

  test('rejects a malformed booking id before remote access', () => {
    expect(() => buildCreateReviewParams('not-a-booking', { rating: 5, comment: '' })).toThrow('invalid booking id');
  });

  test('shows the creation CTA only to the customer of a completed unreviewed booking', () => {
    expect(canCreateBookingReview('customer', 'completed', null)).toBe(true);
    expect(canCreateBookingReview('worker', 'completed', null)).toBe(false);
    expect(canCreateBookingReview('customer', 'completion_pending', null)).toBe(false);
    expect(canCreateBookingReview('customer', 'completed', {
      review_id: 'review', booking_id: bookingId, rating: 5, comment: null, created_at: '2026-10-01T12:00:00Z',
    })).toBe(false);
  });

  test('normalizes one immutable booking review defensively', () => {
    expect(normalizeBookingReview({
      review_id: 'review-1', booking_id: bookingId, rating: '4', comment: null, created_at: '2026-10-01T12:00:00Z',
    })).toEqual(expect.objectContaining({ rating: 4, comment: null }));
    expect(normalizeBookingReview({ review_id: 'review-1', rating: 7 })).toBeNull();
  });

  test('normalizes aggregate numerics and orders public reviews newest first', () => {
    const reputation = normalizePublicWorkerReputation({
      worker_id: '81000000-0000-4000-8000-000000000010',
      average_rating: '4.25',
      review_count: '2',
      reviews: [
        { review_id: 'a', rating: 5, comment: 'Primera', created_at: '2026-09-30T12:00:00Z' },
        { review_id: 'b', rating: 3, comment: 'Segunda', created_at: '2026-10-01T12:00:00Z' },
      ],
    });
    expect(reputation.average_rating).toBe(4.25);
    expect(reputation.review_count).toBe(2);
    expect(reputation.reviews.map((review) => review.review_id)).toEqual(['b', 'a']);
  });

  test('represents the no-review state without fake zero stars', () => {
    const reputation = normalizePublicWorkerReputation({
      worker_id: '81000000-0000-4000-8000-000000000010',
      average_rating: null,
      review_count: 0,
      reviews: [],
    });
    expect(reputation.average_rating).toBeNull();
    expect(formatAverageRating(reputation.average_rating, reputation.review_count)).toBe('No hay reseñas todavía.');
  });

  test('formats stars and real aggregate labels', () => {
    expect(formatRating(4)).toBe('★★★★☆');
    expect(formatAverageRating(4.5, 2)).toMatch(/4[,.]5 · 2 reseñas/);
  });

  test('maps duplicate authorization state validation and network errors safely', () => {
    expect(reviewFailureMessage({ code: '23505', message: 'internal' })).toContain('ya tiene');
    expect(reviewFailureMessage({ code: '42501', message: 'internal' })).toContain('permiso');
    expect(reviewFailureMessage({ code: '55000', message: 'internal' })).toContain('completado');
    expect(reviewFailureMessage({ code: '22023', message: 'internal' })).toContain('no es válida');
    expect(reviewFailureMessage({ message: 'Network request failed' })).toContain('conexión');
    expect(reviewFailureMessage({ code: 'XX000', message: 'secret SQL' })).not.toContain('secret');
  });
});
