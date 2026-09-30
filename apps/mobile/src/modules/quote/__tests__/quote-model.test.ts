import { quoteFailureMessage } from '@/modules/quote/quote-errors';
import {
  buildAcceptQuoteParams,
  buildCreateQuoteParams,
  canAcceptQuote,
  currentQuote,
  formatQuoteAmount,
  normalizeQuoteRevision,
  orderQuoteRevisions,
  prefillFinalSchedule,
  quoteStatusLabels,
  validateFinalSchedule,
  validateQuoteDraft,
} from '@/modules/quote/quote-model';
import type { QuoteDraft, QuoteRevision } from '@/modules/quote/types';

const requestId = '71000000-0000-4000-8000-000000000001';
const quoteId = '72000000-0000-4000-8000-000000000001';
const now = new Date('2026-09-30T12:00:00.000Z');

function validDraft(): QuoteDraft {
  return {
    serviceRequestId: requestId,
    amountText: '350,50',
    message: '  Incluye   materiales\n básicos. ',
    validUntilDate: '2099-10-05',
    validUntilTime: '18:30',
  };
}

function revision(number: number, overrides: Partial<QuoteRevision> = {}): QuoteRevision {
  return {
    quote_id: `72000000-0000-4000-8000-${String(number).padStart(12, '0')}`,
    revision_number: number,
    amount_bob: 300 + number,
    message: `Revisión ${number}`,
    quote_status: 'pending',
    valid_until: null,
    created_at: `2026-09-${20 + number}T12:00:00Z`,
    updated_at: `2026-09-${20 + number}T12:00:00Z`,
    is_current: number === 3,
    booking_id: null,
    scheduled_at: null,
    ...overrides,
  };
}

describe('MOD-07 quote model', () => {
  test('validates and normalizes quote money, message and optional validity', () => {
    const result = validateQuoteDraft(validDraft(), now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      serviceRequestId: requestId,
      amountBob: 350.5,
      message: 'Incluye materiales básicos.',
      validUntilDate: '2099-10-05',
      validUntilTime: '18:30',
    });
  });

  test.each(['', '0', '-5', '10.999', '10000000000'])('rejects invalid money %s', (amountText) => {
    const result = validateQuoteDraft({ ...validDraft(), amountText }, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.amount).toBeDefined();
  });

  test('allows no message and no validity without fabricating values', () => {
    const result = validateQuoteDraft({
      ...validDraft(),
      message: '   ',
      validUntilDate: '',
      validUntilTime: '',
    }, now);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(expect.objectContaining({
      message: null,
      validUntilDate: null,
      validUntilTime: null,
    }));
  });

  test('requires complete and future quote validity when either part is provided', () => {
    const incomplete = validateQuoteDraft({ ...validDraft(), validUntilTime: '' }, now);
    const past = validateQuoteDraft({ ...validDraft(), validUntilDate: '2026-09-30', validUntilTime: '07:00' }, now);
    expect(incomplete.ok).toBe(false);
    expect(past.ok).toBe(false);
  });

  test('builds quote RPC payload without worker identity, revision or status', () => {
    const result = validateQuoteDraft(validDraft(), now);
    if (!result.ok) throw new Error('fixture must be valid');
    const payload = buildCreateQuoteParams(result.value);
    expect(payload).toEqual(expect.objectContaining({
      p_service_request_id: requestId,
      p_amount_bob: 350.5,
    }));
    expect(payload).not.toHaveProperty('worker_id');
    expect(payload).not.toHaveProperty('revision_number');
    expect(payload).not.toHaveProperty('status');
  });

  test('normalizes numeric RPC values', () => {
    expect(normalizeQuoteRevision({
      ...revision(2),
      revision_number: '2',
      amount_bob: '415.75',
    }).amount_bob).toBe(415.75);
  });

  test('orders history deterministically by newest revision and selects current', () => {
    const rows = [revision(1), revision(3), revision(2)];
    expect(orderQuoteRevisions(rows).map((item) => item.revision_number)).toEqual([3, 2, 1]);
    expect(currentQuote(rows)?.revision_number).toBe(3);
  });

  test('uses quote id as deterministic tie-breaker for defensive duplicate input', () => {
    const first = revision(2, { quote_id: '72000000-0000-4000-8000-000000000010' });
    const second = revision(2, { quote_id: '72000000-0000-4000-8000-000000000011' });
    expect(orderQuoteRevisions([first, second]).map((item) => item.quote_id)).toEqual([
      second.quote_id,
      first.quote_id,
    ]);
  });

  test.each([
    [null, null, { date: '', time: '' }],
    ['2026-10-15', null, { date: '2026-10-15', time: '' }],
    [null, '10:30', { date: '', time: '10:30' }],
    ['2026-10-15', '10:30', { date: '2026-10-15', time: '10:30' }],
  ])('prefills final schedule from independent preferences %#', (date, time, expected) => {
    expect(prefillFinalSchedule(date, time)).toEqual(expected);
  });

  test('requires a complete, valid and future final schedule in La Paz', () => {
    expect(validateFinalSchedule({ date: '', time: '' }, now).ok).toBe(false);
    expect(validateFinalSchedule({ date: '2026-02-30', time: '10:00' }, now).ok).toBe(false);
    expect(validateFinalSchedule({ date: '2026-09-30', time: '07:59' }, now).ok).toBe(false);
    expect(validateFinalSchedule({ date: '2026-09-30', time: '08:01' }, now).ok).toBe(true);
  });

  test('builds acceptance payload from date/time and never sends a client timestamp', () => {
    const result = validateFinalSchedule({ date: '2099-10-15', time: '10:30' }, now);
    if (!result.ok) throw new Error('fixture must be valid');
    const payload = buildAcceptQuoteParams(quoteId, result.value);
    expect(payload).toEqual({
      p_quote_id: quoteId,
      p_scheduled_date: '2099-10-15',
      p_scheduled_time: '10:30',
    });
    expect(payload).not.toHaveProperty('scheduled_at');
  });

  test('acceptance eligibility requires customer, quoted request, current pending and unexpired revision', () => {
    const current = revision(3, { valid_until: '2099-10-01T00:00:00Z' });
    expect(canAcceptQuote({ perspective: 'customer', requestStatus: 'quoted', quote: current, now })).toBe(true);
    expect(canAcceptQuote({ perspective: 'worker', requestStatus: 'quoted', quote: current, now })).toBe(false);
    expect(canAcceptQuote({ perspective: 'customer', requestStatus: 'pending', quote: current, now })).toBe(false);
    expect(canAcceptQuote({ perspective: 'customer', requestStatus: 'quoted', quote: { ...current, is_current: false }, now })).toBe(false);
    expect(canAcceptQuote({ perspective: 'customer', requestStatus: 'quoted', quote: { ...current, quote_status: 'superseded' }, now })).toBe(false);
    expect(canAcceptQuote({ perspective: 'customer', requestStatus: 'quoted', quote: { ...current, valid_until: '2026-09-30T11:00:00Z' }, now })).toBe(false);
  });

  test('defines labels for exactly the frozen quote statuses', () => {
    expect(quoteStatusLabels).toEqual({
      pending: 'Vigente',
      accepted: 'Aceptada',
      rejected: 'Rechazada',
      withdrawn: 'Retirada',
      expired: 'Vencida',
      superseded: 'Reemplazada',
    });
  });

  test('maps stale, authorization, validation and network failures safely', () => {
    expect(quoteFailureMessage({ code: '55000', message: 'quote is not current and acceptable' })).toContain('dejó de estar vigente');
    expect(quoteFailureMessage({ code: '42501', message: 'internal detail' })).toContain('permiso');
    expect(quoteFailureMessage({ code: '22023', message: 'scheduled_at must be in the future' })).toContain('fecha y hora');
    expect(quoteFailureMessage({ message: 'Network request failed' })).toContain('conexión');
    expect(quoteFailureMessage({ code: 'XX000', message: 'secret SQL detail' })).not.toContain('secret');
  });

  test('formats BOB amounts with two decimal positions', () => {
    expect(formatQuoteAmount(350)).toMatch(/^Bs\s+350[,.]00$/);
  });
});
