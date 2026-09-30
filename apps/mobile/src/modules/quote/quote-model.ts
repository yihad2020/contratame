import type {
  AcceptQuoteRpcParams,
  CreateQuoteRpcParams,
  CreatedQuote,
  CreatedQuoteRpcRow,
  FinalScheduleDraft,
  QuoteAcceptanceContext,
  QuoteDraft,
  QuoteRevision,
  QuoteRevisionRpcRow,
  QuoteStatus,
  ValidatedFinalSchedule,
  ValidatedQuote,
} from '@/modules/quote/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MONEY_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

export type QuoteValidation =
  | { ok: true; value: ValidatedQuote }
  | { ok: false; errors: Record<string, string> };

export type FinalScheduleValidation =
  | { ok: true; value: ValidatedFinalSchedule }
  | { ok: false; errors: Record<string, string> };

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function isValidDate(value: string) {
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

function laPazMinuteKey(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}

function isFutureLaPaz(date: string, time: string, now: Date) {
  return `${date}T${time}` > laPazMinuteKey(now);
}

export function validateQuoteDraft(draft: QuoteDraft, now = new Date()): QuoteValidation {
  const errors: Record<string, string> = {};
  const requestId = draft.serviceRequestId.trim().toLowerCase();
  const amountText = draft.amountText.trim();
  const message = normalizeWhitespace(draft.message);
  const validUntilDate = draft.validUntilDate.trim();
  const validUntilTime = draft.validUntilTime.trim();

  if (!UUID_PATTERN.test(requestId)) errors.request = 'La solicitud no es válida.';

  let amountBob = Number.NaN;
  if (!MONEY_PATTERN.test(amountText)) {
    errors.amount = 'Ingresa un monto BOB positivo con hasta dos decimales.';
  } else {
    amountBob = Number(amountText.replace(',', '.'));
    if (!Number.isFinite(amountBob) || amountBob <= 0 || amountBob > 9999999999.99) {
      errors.amount = 'Ingresa un monto BOB positivo dentro del rango permitido.';
    }
  }

  if (Boolean(validUntilDate) !== Boolean(validUntilTime)) {
    errors.validUntil = 'Completa fecha y hora de validez, o deja ambas vacías.';
  } else if (validUntilDate && validUntilTime) {
    if (!isValidDate(validUntilDate)) errors.validUntilDate = 'Usa una fecha válida con formato AAAA-MM-DD.';
    if (!TIME_PATTERN.test(validUntilTime)) errors.validUntilTime = 'Usa una hora válida con formato HH:MM.';
    if (!errors.validUntilDate && !errors.validUntilTime && !isFutureLaPaz(validUntilDate, validUntilTime, now)) {
      errors.validUntil = 'La vigencia debe terminar en el futuro.';
    }
  }

  if (Object.keys(errors).length || !Number.isFinite(amountBob) || !UUID_PATTERN.test(requestId)) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      serviceRequestId: requestId,
      amountBob,
      message: message || null,
      validUntilDate: validUntilDate || null,
      validUntilTime: validUntilTime || null,
    },
  };
}

export function buildCreateQuoteParams(value: ValidatedQuote): CreateQuoteRpcParams {
  return {
    p_service_request_id: value.serviceRequestId,
    p_amount_bob: value.amountBob,
    p_message: value.message,
    p_valid_until_date: value.validUntilDate,
    p_valid_until_time: value.validUntilTime,
  };
}

export function normalizeCreatedQuote(row: CreatedQuoteRpcRow): CreatedQuote {
  return {
    ...row,
    revision_number: Number(row.revision_number),
    amount_bob: Number(row.amount_bob),
  };
}

export function normalizeQuoteRevision(row: QuoteRevisionRpcRow): QuoteRevision {
  return {
    ...row,
    revision_number: Number(row.revision_number),
    amount_bob: Number(row.amount_bob),
  };
}

export function orderQuoteRevisions(rows: QuoteRevision[]) {
  return [...rows].sort((left, right) => {
    if (left.revision_number !== right.revision_number) return right.revision_number - left.revision_number;
    return right.quote_id.localeCompare(left.quote_id);
  });
}

export function currentQuote(rows: QuoteRevision[]) {
  return orderQuoteRevisions(rows)[0] ?? null;
}

export function prefillFinalSchedule(preferredDate: string | null, preferredTime: string | null): FinalScheduleDraft {
  return { date: preferredDate ?? '', time: preferredTime ?? '' };
}

export function validateFinalSchedule(draft: FinalScheduleDraft, now = new Date()): FinalScheduleValidation {
  const date = draft.date.trim();
  const time = draft.time.trim();
  const errors: Record<string, string> = {};

  if (!date) errors.date = 'Selecciona la fecha definitiva.';
  else if (!isValidDate(date)) errors.date = 'Usa una fecha válida con formato AAAA-MM-DD.';
  if (!time) errors.time = 'Selecciona la hora definitiva.';
  else if (!TIME_PATTERN.test(time)) errors.time = 'Usa una hora válida con formato HH:MM.';
  if (!errors.date && !errors.time && !isFutureLaPaz(date, time, now)) {
    errors.schedule = 'La fecha y hora definitivas deben estar en el futuro.';
  }

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, value: { date, time } };
}

export function buildAcceptQuoteParams(quoteId: string, schedule: ValidatedFinalSchedule): AcceptQuoteRpcParams {
  return {
    p_quote_id: quoteId,
    p_scheduled_date: schedule.date,
    p_scheduled_time: schedule.time,
  };
}

export function canAcceptQuote({ perspective, requestStatus, quote, now = new Date() }: QuoteAcceptanceContext) {
  return perspective === 'customer'
    && requestStatus === 'quoted'
    && quote?.quote_status === 'pending'
    && quote.is_current
    && (!quote.valid_until || new Date(quote.valid_until).getTime() > now.getTime());
}

export function formatQuoteAmount(amountBob: number) {
  return `Bs ${new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountBob)}`;
}

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  pending: 'Vigente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  withdrawn: 'Retirada',
  expired: 'Vencida',
  superseded: 'Reemplazada',
};
