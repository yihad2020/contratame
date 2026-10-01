import type { PublicWorkerService } from '@/modules/public-worker/types';

export type ServiceRequestStatus =
  | 'pending'
  | 'quoted'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export type ServiceRequestPerspective = 'customer' | 'worker';

export type RequestCoordinate = {
  latitude: number;
  longitude: number;
};

export type ServiceRequestDraft = {
  workerId: string;
  workerServices: PublicWorkerService[];
  selectedServiceId: string;
  description: string;
  preferredDate: string;
  preferredTime: string;
  budgetText: string;
  jobAreaLabel: string;
  addressText: string;
  location: RequestCoordinate | null;
};

export type ValidatedServiceRequest = {
  workerId: string;
  workerServiceId: string;
  description: string;
  preferredDate: string | null;
  preferredTime: string | null;
  budgetReferenceBob: number | null;
  jobAreaLabel: string;
  addressText: string | null;
  latitude: number;
  longitude: number;
};

export type CreateServiceRequestRpcParams = {
  p_worker_id: string;
  p_worker_service_id: string;
  p_description: string;
  p_job_area_label: string;
  p_latitude: number;
  p_longitude: number;
  p_preferred_date: string | null;
  p_preferred_time: string | null;
  p_budget_reference_bob: number | null;
  p_address_text: string | null;
};

export type CreatedServiceRequest = {
  request_id: string;
  request_status: 'pending';
};

export type ServiceRequestListItem = {
  request_id: string;
  perspective: ServiceRequestPerspective;
  counterpart_display_name: string;
  worker_id: string;
  worker_service_id: string;
  service_title: string;
  description: string;
  preferred_date: string | null;
  preferred_time: string | null;
  budget_reference_bob: number | null;
  job_area_label: string;
  status: ServiceRequestStatus;
  created_at: string;
  total_count: number;
};

export type ServiceRequestListRpcRow = Omit<ServiceRequestListItem, 'budget_reference_bob' | 'total_count'> & {
  budget_reference_bob: unknown;
  total_count: unknown;
};

export type ServiceRequestDetail = {
  request_id: string;
  perspective: ServiceRequestPerspective;
  customer_display_name: string;
  worker_display_name: string;
  worker_id: string;
  worker_service_id: string;
  service_title: string;
  description: string;
  preferred_date: string | null;
  preferred_time: string | null;
  budget_reference_bob: number | null;
  job_area_label: string;
  status: ServiceRequestStatus;
  created_at: string;
  updated_at: string;
  exact_latitude: number | null;
  exact_longitude: number | null;
  address_text: string | null;
  booking_id: string | null;
};

export type ServiceRequestDetailRpcRow = Omit<
  ServiceRequestDetail,
  'budget_reference_bob' | 'exact_latitude' | 'exact_longitude'
> & {
  budget_reference_bob: unknown;
  exact_latitude: unknown;
  exact_longitude: unknown;
};

