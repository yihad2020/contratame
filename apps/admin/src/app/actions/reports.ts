'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { validateModerationNotes } from '@/lib/moderation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function safeId(value: FormDataEntryValue | null) {
  const id = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : '';
}
function errorMessage(error: { message?: string } | null) {
  const message = error?.message ?? '';
  if (/stale|not allowed/i.test(message)) return 'El reporte ya fue procesado o cambió de estado. Actualiza la página.';
  if (/administrator/i.test(message)) return 'No tienes autorización para moderar reportes.';
  return 'No pudimos procesar el reporte. Actualiza la página e inténtalo nuevamente.';
}

async function transition(reportId: string, status: 'under_review' | 'resolved' | 'dismissed', notes: string | null) {
  await requireAdmin();
  if (!reportId) redirect('/reports?error=Reporte+inválido.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('transition_user_report', { p_report_id: reportId, p_status: status, p_resolution_notes: notes });
  if (error) redirect(`/reports/${reportId}?error=${encodeURIComponent(errorMessage(error))}`);
  revalidatePath('/reports'); revalidatePath(`/reports/${reportId}`);
  redirect(`/reports/${reportId}?success=${encodeURIComponent(status === 'under_review' ? 'Reporte marcado en revisión.' : status === 'resolved' ? 'Reporte resuelto.' : 'Reporte desestimado.')}`);
}

export async function startReportReview(formData: FormData) { await transition(safeId(formData.get('reportId')), 'under_review', null); }
export async function resolveReport(formData: FormData) {
  const reportId = safeId(formData.get('reportId')); const checked = validateModerationNotes(formData.get('resolutionNotes'));
  if (!checked.ok) redirect(`/reports/${reportId}?error=${encodeURIComponent(checked.error)}`);
  await transition(reportId, 'resolved', checked.value);
}
export async function dismissReport(formData: FormData) {
  const reportId = safeId(formData.get('reportId')); const checked = validateModerationNotes(formData.get('resolutionNotes'));
  if (!checked.ok) redirect(`/reports/${reportId}?error=${encodeURIComponent(checked.error)}`);
  await transition(reportId, 'dismissed', checked.value);
}

