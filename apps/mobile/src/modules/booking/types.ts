import type { ServiceRequestPerspective } from '@/modules/service-request/types';

export type BookingStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completion_pending'
  | 'completed'
  | 'cancelled';

export type BookingAction = 'start' | 'request_completion' | 'confirm_completion';

export type BookingHistoryActor = 'customer' | 'worker' | 'system';

export type BookingHistoryItem = {
  previous_status: BookingStatus | null;
  new_status: BookingStatus;
  changed_by_role: BookingHistoryActor;
  created_at: string;
};

export type BookingListItem = {
  booking_id: string;
  perspective: ServiceRequestPerspective;
  counterpart_display_name: string;
  service_request_id: string;
  service_title: string;
  agreed_price_bob: number;
  scheduled_at: string;
  booking_status: BookingStatus;
  created_at: string;
  total_count: number;
};

export type BookingListRpcRow = Omit<BookingListItem, 'agreed_price_bob' | 'total_count'> & {
  agreed_price_bob: unknown;
  total_count: unknown;
};

export type BookingDetail = {
  booking_id: string;
  perspective: ServiceRequestPerspective;
  customer_display_name: string;
  worker_display_name: string;
  service_request_id: string;
  service_title: string;
  agreed_price_bob: number;
  scheduled_at: string;
  booking_status: BookingStatus;
  started_at: string | null;
  completion_requested_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  job_description: string;
  job_area_label: string;
  exact_latitude: number;
  exact_longitude: number;
  address_text: string | null;
  status_history: BookingHistoryItem[];
};

export type BookingDetailRpcRow = Omit<
  BookingDetail,
  'agreed_price_bob' | 'exact_latitude' | 'exact_longitude' | 'status_history'
> & {
  agreed_price_bob: unknown;
  exact_latitude: unknown;
  exact_longitude: unknown;
  status_history: unknown;
};

export type BookingTransitionResult = {
  booking_id: string;
  booking_status: BookingStatus;
  scheduled_at: string;
  started_at: string | null;
  completion_requested_at: string | null;
  completed_at: string | null;
  updated_at: string;
};
