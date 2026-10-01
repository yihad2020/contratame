import { supabase } from '@/lib/supabase';
import {
  buildBookingTransitionParams,
  normalizeBookingDetail,
  normalizeBookingListItem,
} from '@/modules/booking/booking-model';
import type {
  BookingAction,
  BookingDetail,
  BookingDetailRpcRow,
  BookingListItem,
  BookingListRpcRow,
  BookingTransitionResult,
} from '@/modules/booking/types';
import type { ServiceRequestPerspective } from '@/modules/service-request/types';

export const BOOKING_PAGE_SIZE = 12;

export async function listMyBookings(
  perspective: ServiceRequestPerspective,
  offset: number,
  limit = BOOKING_PAGE_SIZE,
): Promise<BookingListItem[]> {
  const { data, error } = await supabase.rpc('list_my_bookings', {
    p_perspective: perspective,
    p_offset: offset,
    p_limit: limit,
  });
  if (error) throw error;
  return ((data ?? []) as BookingListRpcRow[]).map(normalizeBookingListItem);
}

export async function getMyBooking(bookingId: string): Promise<BookingDetail | null> {
  const { data, error } = await supabase
    .rpc('get_my_booking', { p_booking_id: bookingId })
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeBookingDetail(data as BookingDetailRpcRow) : null;
}

export async function transitionBooking(
  bookingId: string,
  action: BookingAction,
): Promise<BookingTransitionResult> {
  const rpc = action === 'start'
    ? 'start_booking'
    : action === 'request_completion'
      ? 'request_booking_completion'
      : 'confirm_booking_completion';
  const { data, error } = await supabase
    .rpc(rpc, buildBookingTransitionParams(bookingId))
    .single();
  if (error) throw error;
  return data as BookingTransitionResult;
}
