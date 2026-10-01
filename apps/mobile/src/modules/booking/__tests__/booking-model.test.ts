import { bookingFailureMessage } from '@/modules/booking/booking-errors';
import {
  availableBookingAction,
  buildBookingTransitionParams,
  bookingHistoryActorLabels,
  bookingLifecycle,
  bookingStatusLabels,
  formatBookingAmount,
  formatBookingDateTime,
  mergeBookingPages,
  normalizeBookingDetail,
  normalizeBookingId,
  normalizeBookingListItem,
} from '@/modules/booking/booking-model';
import type { BookingDetailRpcRow, BookingListItem, BookingListRpcRow } from '@/modules/booking/types';

const bookingId = '85000000-0000-4000-8000-000000000001';

function listRow(overrides: Partial<BookingListRpcRow> = {}): BookingListRpcRow {
  return {
    booking_id: bookingId,
    perspective: 'customer',
    counterpart_display_name: 'Ana P.',
    service_request_id: '83000000-0000-4000-8000-000000000001',
    service_title: 'Instalación eléctrica',
    agreed_price_bob: '425.75',
    scheduled_at: '2099-10-15T14:30:00Z',
    booking_status: 'scheduled',
    created_at: '2026-10-01T12:00:00Z',
    total_count: '3',
    ...overrides,
  };
}

function detailRow(overrides: Partial<BookingDetailRpcRow> = {}): BookingDetailRpcRow {
  return {
    booking_id: bookingId,
    perspective: 'worker',
    customer_display_name: 'Carla C.',
    worker_display_name: 'Ana P.',
    service_request_id: '83000000-0000-4000-8000-000000000001',
    service_title: 'Instalación eléctrica',
    agreed_price_bob: '425.75',
    scheduled_at: '2099-10-15T14:30:00Z',
    booking_status: 'in_progress',
    started_at: '2026-10-01T13:00:00Z',
    completion_requested_at: null,
    completed_at: null,
    created_at: '2026-10-01T12:00:00Z',
    updated_at: '2026-10-01T13:00:00Z',
    job_description: 'Revisar instalación del domicilio.',
    job_area_label: 'Equipetrol',
    exact_latitude: '-17.78',
    exact_longitude: '-63.18',
    address_text: 'Dirección privada',
    status_history: [
      { previous_status: null, new_status: 'scheduled', changed_by_role: 'customer', created_at: '2026-10-01T12:00:00Z' },
      { previous_status: 'scheduled', new_status: 'in_progress', changed_by_role: 'worker', created_at: '2026-10-01T13:00:00Z' },
    ],
    ...overrides,
  };
}

describe('MOD-08 booking model', () => {
  test('normalizes only canonical booking route ids', () => {
    expect(normalizeBookingId(` ${bookingId.toUpperCase()} `)).toBe(bookingId);
    expect(normalizeBookingId('booking-1')).toBeNull();
    expect(normalizeBookingId([bookingId])).toBeNull();
  });

  test('builds a narrow transition payload without actor, status or client timestamp', () => {
    expect(buildBookingTransitionParams(bookingId)).toEqual({ p_booking_id: bookingId });
    expect(buildBookingTransitionParams(bookingId)).not.toHaveProperty('actor');
    expect(buildBookingTransitionParams(bookingId)).not.toHaveProperty('status');
    expect(() => buildBookingTransitionParams('invalid')).toThrow('invalid booking id');
  });

  test('defines the approved sequential lifecycle without cancellation edges', () => {
    expect(bookingLifecycle).toEqual(['scheduled', 'in_progress', 'completion_pending', 'completed']);
  });

  test('defines Spanish labels for exactly the frozen statuses', () => {
    expect(bookingStatusLabels).toEqual({
      scheduled: 'Programado',
      in_progress: 'En curso',
      completion_pending: 'Finalización pendiente',
      completed: 'Completado',
      cancelled: 'Cancelado',
    });
  });

  test('allows only worker start, worker completion request and customer confirmation', () => {
    expect(availableBookingAction('worker', 'scheduled')).toBe('start');
    expect(availableBookingAction('customer', 'scheduled')).toBeNull();
    expect(availableBookingAction('worker', 'in_progress')).toBe('request_completion');
    expect(availableBookingAction('customer', 'in_progress')).toBeNull();
    expect(availableBookingAction('customer', 'completion_pending')).toBe('confirm_completion');
    expect(availableBookingAction('worker', 'completion_pending')).toBeNull();
  });

  test.each(['customer', 'worker'] as const)('keeps completed bookings read-only for %s', (perspective) => {
    expect(availableBookingAction(perspective, 'completed')).toBeNull();
  });

  test('does not expose a cancellation action while its policy is pending', () => {
    expect(availableBookingAction('customer', 'cancelled')).toBeNull();
    expect(availableBookingAction('worker', 'cancelled')).toBeNull();
  });

  test('normalizes booking list numeric payload and status', () => {
    expect(normalizeBookingListItem(listRow())).toEqual(expect.objectContaining({
      agreed_price_bob: 425.75,
      total_count: 3,
      booking_status: 'scheduled',
    }));
  });

  test('normalizes detail, coordinates and safe history', () => {
    const normalized = normalizeBookingDetail(detailRow());
    expect(normalized).toEqual(expect.objectContaining({
      agreed_price_bob: 425.75,
      exact_latitude: -17.78,
      exact_longitude: -63.18,
      booking_status: 'in_progress',
    }));
    expect(normalized.status_history).toHaveLength(2);
    expect(normalized.status_history[1]).toEqual(expect.objectContaining({
      previous_status: 'scheduled',
      new_status: 'in_progress',
      changed_by_role: 'worker',
    }));
  });

  test('drops malformed history items and maps unknown actor safely to system', () => {
    const normalized = normalizeBookingDetail(detailRow({
      status_history: [
        null,
        { previous_status: 'bogus', new_status: 'completed', changed_by_role: 'admin', created_at: '2026-10-01T14:00:00Z' },
        { new_status: 'completed' },
      ],
    }));
    expect(normalized.status_history).toEqual([{
      previous_status: null,
      new_status: 'completed',
      changed_by_role: 'system',
      created_at: '2026-10-01T14:00:00Z',
    }]);
  });

  test('provides Spanish actor labels without exposing participant ids', () => {
    expect(bookingHistoryActorLabels).toEqual({ customer: 'Cliente', worker: 'Profesional', system: 'Sistema' });
  });

  test('merges paginated results by booking id', () => {
    const first = normalizeBookingListItem(listRow()) as BookingListItem;
    const refreshed = { ...first, booking_status: 'in_progress' as const };
    const second = normalizeBookingListItem(listRow({ booking_id: '85000000-0000-4000-8000-000000000002' }));
    const merged = mergeBookingPages([first], [refreshed, second]);
    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.booking_id === bookingId)?.booking_status).toBe('in_progress');
  });

  test('formats schedule in America/La_Paz and money in BOB', () => {
    expect(formatBookingDateTime('2026-10-01T14:30:00Z')).toMatch(/10:30/);
    expect(formatBookingAmount(425)).toMatch(/^Bs\s+425[,.]00$/);
  });

  test('maps authorization, stale, validation, network and unknown errors safely', () => {
    expect(bookingFailureMessage({ code: '42501', message: 'internal' })).toContain('permiso');
    expect(bookingFailureMessage({ code: '55000', message: 'booking is not scheduled' })).toContain('ya cambió');
    expect(bookingFailureMessage({ code: '22023', message: 'internal' })).toContain('no son válidos');
    expect(bookingFailureMessage({ message: 'Network request failed' })).toContain('conexión');
    expect(bookingFailureMessage({ code: 'XX000', message: 'secret SQL detail' })).not.toContain('secret');
  });

  test('normalizes unavailable malformed payload defensively', () => {
    const normalized = normalizeBookingDetail(detailRow({ status_history: 'not-an-array', booking_status: 'unknown' as never }));
    expect(normalized.status_history).toEqual([]);
    expect(normalized.booking_status).toBe('scheduled');
  });
});
