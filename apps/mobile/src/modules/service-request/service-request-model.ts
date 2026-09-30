import type {
  CreateServiceRequestRpcParams,
  ServiceRequestDetail,
  ServiceRequestDetailRpcRow,
  ServiceRequestDraft,
  ServiceRequestListItem,
  ServiceRequestListRpcRow,
  ServiceRequestStatus,
  ValidatedServiceRequest,
} from '@/modules/service-request/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const BUDGET_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

export type ServiceRequestValidation =
  | { ok: true; value: ValidatedServiceRequest }
  | { ok: false; errors: Record<string, string> };

export function normalizeServiceRequestId(value: string | string[] | undefined) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return UUID_PATTERN.test(clean) ? clean.toLowerCase() : null;
}

export function normalizeRequestWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function validDate(value: string) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() === month - 1
    && candidate.getUTCDate() === day;
}

export function validateServiceRequest(draft: ServiceRequestDraft): ServiceRequestValidation {
  const errors: Record<string, string> = {};
  const workerId = normalizeServiceRequestId(draft.workerId);
  const workerServiceId = normalizeServiceRequestId(draft.selectedServiceId);
  const description = normalizeRequestWhitespace(draft.description);
  const jobAreaLabel = normalizeRequestWhitespace(draft.jobAreaLabel);
  const addressText = normalizeRequestWhitespace(draft.addressText);
  const preferredDate = draft.preferredDate.trim();
  const preferredTime = draft.preferredTime.trim();
  const budgetText = draft.budgetText.trim();

  if (!workerId) errors.worker = 'El profesional seleccionado no es válido.';
  if (!workerServiceId || !draft.workerServices.some((service) => service.service_id === workerServiceId)) {
    errors.service = 'Selecciona uno de los servicios activos del profesional.';
  }
  if (Array.from(description).length < 1 || Array.from(description).length > 2000) {
    errors.description = 'Describe el trabajo en un máximo de 2000 caracteres.';
  }
  if (Array.from(jobAreaLabel).length < 1 || Array.from(jobAreaLabel).length > 160) {
    errors.jobAreaLabel = 'Escribe una referencia de zona de hasta 160 caracteres.';
  }
  if (Array.from(addressText).length > 300) {
    errors.addressText = 'La dirección no puede superar 300 caracteres.';
  }
  if (preferredDate && !validDate(preferredDate)) {
    errors.preferredDate = 'Usa una fecha válida con formato AAAA-MM-DD.';
  }
  if (preferredTime && !TIME_PATTERN.test(preferredTime)) {
    errors.preferredTime = 'Usa una hora válida con formato HH:MM.';
  }

  let budgetReferenceBob: number | null = null;
  if (budgetText) {
    if (!BUDGET_PATTERN.test(budgetText)) {
      errors.budget = 'Ingresa un monto BOB positivo con hasta dos decimales.';
    } else {
      budgetReferenceBob = Number(budgetText.replace(',', '.'));
      if (!Number.isFinite(budgetReferenceBob) || budgetReferenceBob <= 0 || budgetReferenceBob > 9999999999.99) {
        errors.budget = 'Ingresa un monto BOB positivo dentro del rango permitido.';
      }
    }
  }

  const latitude = draft.location?.latitude;
  const longitude = draft.location?.longitude;
  if (latitude === undefined || longitude === undefined
      || !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    errors.location = 'Selecciona una ubicación exacta válida para el trabajo.';
  }

  if (Object.keys(errors).length || !workerId || !workerServiceId
      || latitude === undefined || longitude === undefined) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      workerId,
      workerServiceId,
      description,
      preferredDate: preferredDate || null,
      preferredTime: preferredTime || null,
      budgetReferenceBob,
      jobAreaLabel,
      addressText: addressText || null,
      latitude,
      longitude,
    },
  };
}

export function buildCreateServiceRequestParams(value: ValidatedServiceRequest): CreateServiceRequestRpcParams {
  return {
    p_worker_id: value.workerId,
    p_worker_service_id: value.workerServiceId,
    p_description: value.description,
    p_job_area_label: value.jobAreaLabel,
    p_latitude: value.latitude,
    p_longitude: value.longitude,
    p_preferred_date: value.preferredDate,
    p_preferred_time: value.preferredTime,
    p_budget_reference_bob: value.budgetReferenceBob,
    p_address_text: value.addressText,
  };
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeServiceRequestListItem(row: ServiceRequestListRpcRow): ServiceRequestListItem {
  return {
    ...row,
    preferred_time: row.preferred_time?.slice(0, 5) ?? null,
    budget_reference_bob: optionalNumber(row.budget_reference_bob),
    total_count: Number(row.total_count),
  };
}

export function normalizeServiceRequestDetail(row: ServiceRequestDetailRpcRow): ServiceRequestDetail {
  return {
    ...row,
    preferred_time: row.preferred_time?.slice(0, 5) ?? null,
    budget_reference_bob: optionalNumber(row.budget_reference_bob),
    exact_latitude: optionalNumber(row.exact_latitude),
    exact_longitude: optionalNumber(row.exact_longitude),
  };
}

export function mergeServiceRequestPages(
  current: ServiceRequestListItem[],
  incoming: ServiceRequestListItem[],
) {
  const byId = new Map(current.map((item) => [item.request_id, item]));
  incoming.forEach((item) => byId.set(item.request_id, item));
  return Array.from(byId.values());
}

export const serviceRequestStatusLabels: Record<ServiceRequestStatus, string> = {
  pending: 'Pendiente',
  quoted: 'Cotizada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  expired: 'Expirada',
};

export function formatRequestDate(date: string | null) {
  if (!date) return 'Fecha por acordar';
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day));
}

