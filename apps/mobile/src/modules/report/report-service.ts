import { supabase } from '@/lib/supabase';
import { normalizeUserReport } from '@/modules/report/report-model';
import type { ReportCursor, ReportReason, UserReport } from '@/modules/report/types';

export const REPORT_PAGE_SIZE = 20;

export async function createProfileReport(workerId: string, reason: ReportReason, description: string) {
  const { data, error } = await supabase.rpc('create_profile_report', { p_worker_id: workerId, p_reason: reason, p_description: description }).single();
  if (error) throw error;
  return data as { report_id: string; report_status: 'open'; report_created_at: string };
}

export async function createBookingReport(bookingId: string, reason: ReportReason, description: string) {
  const { data, error } = await supabase.rpc('create_booking_report', { p_booking_id: bookingId, p_reason: reason, p_description: description }).single();
  if (error) throw error;
  return data as { report_id: string; report_status: 'open'; report_created_at: string };
}

export async function listMyReports(cursor: ReportCursor | null, limit = REPORT_PAGE_SIZE): Promise<UserReport[]> {
  const { data, error } = await supabase.rpc('list_my_user_reports', {
    p_before_created_at: cursor?.createdAt ?? null,
    p_before_report_id: cursor?.reportId ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return ((data ?? []) as unknown[]).flatMap((row) => { const report = normalizeUserReport(row); return report ? [report] : []; });
}

export async function getMyReport(reportId: string): Promise<UserReport | null> {
  const { data, error } = await supabase.rpc('get_my_user_report', { p_report_id: reportId }).maybeSingle();
  if (error) throw error;
  return data ? normalizeUserReport(data) : null;
}

