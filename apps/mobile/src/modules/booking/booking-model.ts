import type {
  BookingAction,
  BookingDetail,
  BookingDetailRpcRow,
  BookingHistoryActor,
  BookingHistoryItem,
  BookingListItem,
  BookingListRpcRow,
  BookingStatus,
} from '@/modules/booking/types';
import type { ServiceRequestPerspective } from '@/modules/service-request/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bookingStatuses: BookingStatus[] = [
  'scheduled',
  'in_progress',
  'completion_pending',
  'completed',
  'cancelled',
];
const historyActors: BookingHistoryActor[] = ['customer', 'worker', 'system'];

export const bookingLifecycle: BookingStatus[] = [
  'scheduled',
  'in_progress',
  'completion_pending',
  'completed',
];

export const bookingStatusLabels: Record<BookingStatus, string> = {
  scheduled: 'Programado',
  in_progress: 'En curso',
  completion_pending: 'Finalización pendiente',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export const bookingHistoryActorLabels: Record<BookingHistoryActor, string> = {
  customer: 'Cliente',
  worker: 'Profesional',
  system: 'Sistema',
};

export function normalizeBookingId(value: string | string[] | undefined) {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase();
  return UUID_PATTERN.test(clean) ? clean : null;
}

export function buildBookingTransitionParams(bookingId: string) {
  const normalized = normalizeBookingId(bookingId);
  if (!normalized) throw new Error('invalid booking id');
  return { p_booking_id: normalized };
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeStatus(value: unknown): BookingStatus {
  return bookingStatuses.includes(value as BookingStatus) ? value as BookingStatus : 'scheduled';
}

function normalizeHistory(value: unknown): BookingHistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const row = candidate as Record<string, unknown>;
    const newStatus = normalizeStatus(row.new_status);
    const previousStatus = row.previous_status === null
      ? null
      : bookingStatuses.includes(row.previous_status as BookingStatus)
        ? row.previous_status as BookingStatus
        : null;
    const changedByRole = historyActors.includes(row.changed_by_role as BookingHistoryActor)
      ? row.changed_by_role as BookingHistoryActor
      : 'system';
    if (typeof row.created_at !== 'string') return [];
    return [{
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by_role: changedByRole,
      created_at: row.created_at,
    }];
  });
}

export function normalizeBookingListItem(row: BookingListRpcRow): BookingListItem {
  return {
    ...row,
    booking_status: normalizeStatus(row.booking_status),
    agreed_price_bob: Number(row.agreed_price_bob),
    total_count: Number(row.total_count),
  };
}

export function normalizeBookingDetail(row: BookingDetailRpcRow): BookingDetail {
  const latitude = optionalNumber(row.exact_latitude);
  const longitude = optionalNumber(row.exact_longitude);
  return {
    ...row,
    booking_status: normalizeStatus(row.booking_status),
    agreed_price_bob: Number(row.agreed_price_bob),
    exact_latitude: latitude ?? 0,
    exact_longitude: longitude ?? 0,
    status_history: normalizeHistory(row.status_history),
  };
}

export function availableBookingAction(
  perspective: ServiceRequestPerspective,
  status: BookingStatus,
): BookingAction | null {
  if (perspective === 'worker' && status === 'scheduled') return 'start';
  if (perspective === 'worker' && status === 'in_progress') return 'request_completion';
  if (perspective === 'customer' && status === 'completion_pending') return 'confirm_completion';
  return null;
}

export function mergeBookingPages(current: BookingListItem[], incoming: BookingListItem[]) {
  const byId = new Map(current.map((item) => [item.booking_id, item]));
  incoming.forEach((item) => byId.set(item.booking_id, item));
  return Array.from(byId.values());
}

export function formatBookingDateTime(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(new Date(value));
}

export function formatBookingAmount(amountBob: number) {
  return `Bs ${new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountBob)}`;
}
