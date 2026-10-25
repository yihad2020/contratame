import { notFound } from 'next/navigation';
import type { AdminReport, ReportStatus } from '@/lib/report-types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function asReports(value: unknown): AdminReport[] { return Array.isArray(value) ? value as AdminReport[] : []; }

export async function listReports(status: ReportStatus | null, beforeCreatedAt: string | null, beforeReportId: string | null) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('list_admin_user_reports', {
    p_status: status,
    p_before_created_at: beforeCreatedAt,
    p_before_report_id: beforeReportId,
    p_limit: 31,
  });
  if (error) throw error;
  const rows = asReports(data);
  return { reports: rows.slice(0, 30), hasMore: rows.length > 30 };
}

export async function getReport(reportId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_admin_user_report', { p_report_id: reportId }).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return data as AdminReport;
}

