import { supabase } from '@/lib/supabase';
import {
  buildAcceptQuoteParams,
  buildCreateQuoteParams,
  normalizeCreatedQuote,
  normalizeQuoteRevision,
  orderQuoteRevisions,
} from '@/modules/quote/quote-model';
import type {
  AcceptedQuoteResult,
  CreatedQuote,
  CreatedQuoteRpcRow,
  QuoteRevision,
  QuoteRevisionRpcRow,
  ValidatedFinalSchedule,
  ValidatedQuote,
} from '@/modules/quote/types';

export async function createServiceRequestQuote(value: ValidatedQuote): Promise<CreatedQuote> {
  const { data, error } = await supabase
    .rpc('create_service_request_quote', buildCreateQuoteParams(value))
    .single();
  if (error) throw error;
  return normalizeCreatedQuote(data as CreatedQuoteRpcRow);
}

export async function listMyServiceRequestQuotes(serviceRequestId: string): Promise<QuoteRevision[]> {
  const { data, error } = await supabase.rpc('list_my_service_request_quotes', {
    p_service_request_id: serviceRequestId,
  });
  if (error) throw error;
  return orderQuoteRevisions(((data ?? []) as QuoteRevisionRpcRow[]).map(normalizeQuoteRevision));
}

export async function acceptServiceRequestQuote(
  quoteId: string,
  schedule: ValidatedFinalSchedule,
): Promise<AcceptedQuoteResult> {
  const { data, error } = await supabase
    .rpc('accept_service_request_quote', buildAcceptQuoteParams(quoteId, schedule))
    .single();
  if (error) throw error;
  return data as AcceptedQuoteResult;
}
