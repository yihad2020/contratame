export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export type BookingReview = {
  review_id: string;
  booking_id: string;
  rating: ReviewRating;
  comment: string | null;
  created_at: string;
};

export type CreateReviewResult = BookingReview & { worker_id: string };

export type PublicReview = Omit<BookingReview, 'booking_id'>;

export type PublicWorkerReputation = {
  worker_id: string;
  average_rating: number | null;
  review_count: number;
  reviews: PublicReview[];
};

export type PublicWorkerReputationRpcRow = Omit<
  PublicWorkerReputation,
  'average_rating' | 'review_count' | 'reviews'
> & {
  average_rating: unknown;
  review_count: unknown;
  reviews: unknown;
};

export type ReviewDraft = {
  rating: number | null;
  comment: string;
};

export type ReviewValidation =
  | { ok: true; rating: ReviewRating; comment: string | null }
  | { ok: false; ratingError: string | null };
