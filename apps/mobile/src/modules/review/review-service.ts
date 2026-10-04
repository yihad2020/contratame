import { supabase } from '@/lib/supabase';
import {
  buildCreateReviewParams,
  normalizeBookingReview,
  normalizePublicWorkerReputation,
} from '@/modules/review/review-model';
import type {
  BookingReview,
  CreateReviewResult,
  PublicWorkerReputation,
  PublicWorkerReputationRpcRow,
  ReviewDraft,
} from '@/modules/review/types';

export const PUBLIC_REVIEW_PAGE_SIZE = 10;

export async function createBookingReview(bookingId: string, draft: ReviewDraft): Promise<CreateReviewResult> {
  const { data, error } = await supabase
    .rpc('create_booking_review', buildCreateReviewParams(bookingId, draft))
    .single();
  if (error) throw error;
  return data as CreateReviewResult;
}

export async function getMyBookingReview(bookingId: string): Promise<BookingReview | null> {
  const { data, error } = await supabase
    .rpc('get_my_booking_review', { p_booking_id: bookingId })
    .maybeSingle();
  if (error) throw error;
  return normalizeBookingReview(data);
}

export async function getPublicWorkerReputation(
  workerId: string,
  offset = 0,
  limit = PUBLIC_REVIEW_PAGE_SIZE,
): Promise<PublicWorkerReputation | null> {
  const { data, error } = await supabase
    .rpc('get_public_worker_reputation', {
      p_worker_id: workerId,
      p_offset: offset,
      p_limit: limit,
    })
    .maybeSingle();
  if (error) throw error;
  return data ? normalizePublicWorkerReputation(data as PublicWorkerReputationRpcRow) : null;
}
