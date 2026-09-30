import type { ServiceRequestPerspective, ServiceRequestStatus } from '@/modules/service-request/types';

export type QuoteStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired'
  | 'superseded';

export type QuoteDraft = {
  serviceRequestId: string;
  amountText: string;
  message: string;
  validUntilDate: string;
  validUntilTime: string;
};

export type ValidatedQuote = {
  serviceRequestId: string;
  amountBob: number;
  message: string | null;
  validUntilDate: string | null;
  validUntilTime: string | null;
};

export type CreateQuoteRpcParams = {
  p_service_request_id: string;
  p_amount_bob: number;
  p_message: string | null;
  p_valid_until_date: string | null;
  p_valid_until_time: string | null;
};

export type CreatedQuote = {
  quote_id: string;
  revision_number: number;
  quote_status: 'pending';
  amount_bob: number;
  message: string | null;
  valid_until: string | null;
  created_at: string;
};

export type CreatedQuoteRpcRow = Omit<CreatedQuote, 'revision_number' | 'amount_bob'> & {
  revision_number: unknown;
  amount_bob: unknown;
};

export type QuoteRevision = {
  quote_id: string;
  revision_number: number;
  amount_bob: number;
  message: string | null;
  quote_status: QuoteStatus;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  is_current: boolean;
  booking_id: string | null;
  scheduled_at: string | null;
};

export type QuoteRevisionRpcRow = Omit<QuoteRevision, 'revision_number' | 'amount_bob'> & {
  revision_number: unknown;
  amount_bob: unknown;
};

export type FinalScheduleDraft = {
  date: string;
  time: string;
};

export type ValidatedFinalSchedule = {
  date: string;
  time: string;
};

export type AcceptQuoteRpcParams = {
  p_quote_id: string;
  p_scheduled_date: string;
  p_scheduled_time: string;
};

export type AcceptedQuoteResult = {
  accepted_quote_id: string;
  booking_id: string;
  request_status: 'accepted';
  booking_status: 'scheduled';
  scheduled_at: string;
};

export type QuoteAcceptanceContext = {
  perspective: ServiceRequestPerspective;
  requestStatus: ServiceRequestStatus;
  quote: QuoteRevision | null;
  now?: Date;
};
