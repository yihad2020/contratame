import { serviceRequestFailureMessage } from '@/modules/service-request/service-request-errors';
import {
  buildCreateServiceRequestParams,
  formatRequestDate,
  mergeServiceRequestPages,
  normalizeRequestWhitespace,
  normalizeServiceRequestDetail,
  normalizeServiceRequestId,
  normalizeServiceRequestListItem,
  serviceRequestStatusLabels,
  validateServiceRequest,
} from '@/modules/service-request/service-request-model';
import type { PublicWorkerService } from '@/modules/public-worker/types';
import type { ServiceRequestDraft, ServiceRequestListItem } from '@/modules/service-request/types';

const workerId = '61000000-0000-4000-8000-000000000010';
const serviceId = '62000000-0000-4000-8000-000000000010';
const service: PublicWorkerService = {
  service_id: serviceId,
  category_id: '00000000-0000-4000-8000-000000000001',
  category_name: 'Electricidad',
  category_slug: 'electricidad',
  category_icon_key: 'bolt',
  title: 'Instalación eléctrica',
  description: 'Instalación residencial.',
  pricing_type: 'fixed',
  price_bob: 180,
};

function validDraft(): ServiceRequestDraft {
  return {
    workerId,
    workerServices: [service],
    selectedServiceId: serviceId,
    description: '  Revisar   tablero\n eléctrico  ',
    preferredDate: '2026-10-15',
    preferredTime: '10:30',
    budgetText: '350,50',
    jobAreaLabel: '  Equipetrol   Norte ',
    addressText: ' Calle 8,  casa 12 ',
    location: { latitude: -17.7812, longitude: -63.1818 },
  };
}

function listItem(id: string): ServiceRequestListItem {
  return {
    request_id: id,
    perspective: 'customer',
    counterpart_display_name: 'Ana P.',
    worker_id: workerId,
    worker_service_id: serviceId,
    service_title: service.title,
    description: 'Revisar tablero eléctrico',
    preferred_date: null,
    preferred_time: null,
    budget_reference_bob: null,
    job_area_label: 'Equipetrol',
    status: 'pending',
    created_at: '2026-09-29T12:00:00Z',
    total_count: 2,
  };
}

describe('MOD-06 service request model', () => {
  test('normalizes route identifiers without accepting arrays or malformed values', () => {
    expect(normalizeServiceRequestId(` ${workerId.toUpperCase()} `)).toBe(workerId);
    expect(normalizeServiceRequestId([workerId])).toBeNull();
    expect(normalizeServiceRequestId('invalid')).toBeNull();
  });

  test('normalizes user whitespace without truncating content', () => {
    expect(normalizeRequestWhitespace('  uno\n dos   tres ')).toBe('uno dos tres');
  });

  test('validates and normalizes all frozen request fields', () => {
    const result = validateServiceRequest(validDraft());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      workerId,
      workerServiceId: serviceId,
      description: 'Revisar tablero eléctrico',
      preferredDate: '2026-10-15',
      preferredTime: '10:30',
      budgetReferenceBob: 350.5,
      jobAreaLabel: 'Equipetrol Norte',
      addressText: 'Calle 8, casa 12',
      latitude: -17.7812,
      longitude: -63.1818,
    });
  });

  test('requires selection from the target worker active service allowlist', () => {
    const result = validateServiceRequest({ ...validDraft(), selectedServiceId: '62000000-0000-4000-8000-000000000099' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.service).toBeDefined();
  });

  test.each([
    null,
    { latitude: Number.NaN, longitude: -63.18 },
    { latitude: -91, longitude: -63.18 },
    { latitude: -17.78, longitude: 181 },
  ])('rejects missing, NaN or out-of-range request location %#', (location) => {
    const result = validateServiceRequest({ ...validDraft(), location });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.location).toBeDefined();
  });

  test('rejects empty description and malformed optional schedule or budget', () => {
    const result = validateServiceRequest({
      ...validDraft(),
      description: '   ',
      preferredDate: '2026-02-30',
      preferredTime: '25:80',
      budgetText: '-5',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(expect.arrayContaining([
      'description', 'preferredDate', 'preferredTime', 'budget',
    ]));
  });

  test('builds an RPC payload without customer identity or mutable status', () => {
    const result = validateServiceRequest(validDraft());
    if (!result.ok) throw new Error('fixture must be valid');
    const payload = buildCreateServiceRequestParams(result.value);
    expect(payload).toEqual(expect.objectContaining({
      p_worker_id: workerId,
      p_worker_service_id: serviceId,
      p_latitude: -17.7812,
      p_longitude: -63.1818,
    }));
    expect(payload).not.toHaveProperty('customer_profile_id');
    expect(payload).not.toHaveProperty('status');
  });

  test('maps backend failures to safe user messages without SQL detail', () => {
    expect(serviceRequestFailureMessage({ code: '22023', message: 'worker or service is not eligible' }))
      .toContain('ya no está disponible');
    expect(serviceRequestFailureMessage({ code: 'XX000', message: 'secret SQL detail' }))
      .toBe('No pudimos completar la operación con la solicitud. Inténtalo nuevamente.');
    expect(serviceRequestFailureMessage({ message: 'Network request failed' })).toContain('conexión');
  });

  test('normalizes request list numeric and time values', () => {
    const normalized = normalizeServiceRequestListItem({
      ...listItem('a'),
      preferred_time: '08:30:00',
      budget_reference_bob: '120.50',
      total_count: '3',
    });
    expect(normalized.preferred_time).toBe('08:30');
    expect(normalized.budget_reference_bob).toBe(120.5);
    expect(normalized.total_count).toBe(3);
  });

  test('normalizes detail coordinates while preserving worker-private nulls', () => {
    const base = {
      ...listItem('a'),
      customer_display_name: 'Carla C.',
      worker_display_name: 'Ana P.',
      updated_at: '2026-09-29T12:00:00Z',
      exact_latitude: '-17.78',
      exact_longitude: '-63.18',
      address_text: 'Calle 8',
      booking_id: null,
    };
    const normalized = normalizeServiceRequestDetail(base);
    expect(normalized.exact_latitude).toBe(-17.78);
    expect(normalized.exact_longitude).toBe(-63.18);
    expect(normalizeServiceRequestDetail({ ...base, exact_latitude: null, exact_longitude: null, address_text: null }).exact_latitude).toBeNull();
  });

  test('uses only the frozen request status labels', () => {
    expect(serviceRequestStatusLabels).toEqual({
      pending: 'Pendiente', quoted: 'Cotizada', accepted: 'Aceptada', rejected: 'Rechazada',
      cancelled: 'Cancelada', expired: 'Expirada',
    });
  });

  test('deduplicates paginated rows by request id', () => {
    const first = listItem('a');
    const newer = { ...first, description: 'actualizada' };
    const second = listItem('b');
    expect(mergeServiceRequestPages([first], [newer, second])).toEqual([newer, second]);
  });

  test('formats approved optional dates without timezone drift', () => {
    expect(formatRequestDate(null)).toBe('Fecha por acordar');
    expect(formatRequestDate('2026-10-15')).toMatch(/15.*oct.*2026/i);
  });
});

