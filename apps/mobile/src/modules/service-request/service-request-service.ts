import { supabase } from '@/lib/supabase';
import {
  buildCreateServiceRequestParams,
  normalizeServiceRequestDetail,
  normalizeServiceRequestListItem,
} from '@/modules/service-request/service-request-model';
import type {
  CreatedServiceRequest,
  ServiceRequestDetail,
  ServiceRequestDetailRpcRow,
  ServiceRequestListItem,
  ServiceRequestListRpcRow,
  ServiceRequestPerspective,
  ValidatedServiceRequest,
} from '@/modules/service-request/types';

export const SERVICE_REQUEST_PAGE_SIZE = 12;

export async function createServiceRequest(value: ValidatedServiceRequest) {
  const { data, error } = await supabase
    .rpc('create_service_request', buildCreateServiceRequestParams(value))
    .single();
  if (error) throw error;
  return data as CreatedServiceRequest;
}

export async function listMyServiceRequests(
  perspective: ServiceRequestPerspective,
  offset: number,
  limit = SERVICE_REQUEST_PAGE_SIZE,
): Promise<ServiceRequestListItem[]> {
  const { data, error } = await supabase.rpc('list_my_service_requests', {
    p_perspective: perspective,
    p_offset: offset,
    p_limit: limit,
  });
  if (error) throw error;
  return ((data ?? []) as ServiceRequestListRpcRow[]).map(normalizeServiceRequestListItem);
}

export async function getMyServiceRequest(requestId: string): Promise<ServiceRequestDetail | null> {
  const { data, error } = await supabase
    .rpc('get_my_service_request', { p_request_id: requestId })
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeServiceRequestDetail(data as ServiceRequestDetailRpcRow) : null;
}

