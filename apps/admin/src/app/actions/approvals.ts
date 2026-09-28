'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/auth';
import { validateRejectionReason } from '@/lib/rejection';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function messageFor(error: { message?: string } | null) {
  const message = error?.message ?? '';
  if (message.includes('already reviewed')) return 'Esta solicitud ya fue revisada.';
  if (message.includes('not the current submission') || message.includes('not pending approval')) return 'Esta solicitud ya no es la solicitud pendiente actual.';
  return 'No pudimos procesar la solicitud. Actualiza la página e inténtalo nuevamente.';
}

export async function approveRequest(formData: FormData) {
  await requireAdmin();
  const requestId = String(formData.get('requestId') ?? '');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('approve_worker_submission', { p_request_id: requestId });
  if (error) redirect(`/worker-approvals/${requestId}?error=${encodeURIComponent(messageFor(error))}`);
  revalidatePath('/');
  revalidatePath('/worker-approvals');
  revalidatePath(`/worker-approvals/${requestId}`);
  redirect(`/worker-approvals/${requestId}?success=Perfil+profesional+aprobado.`);
}

export async function rejectRequest(formData: FormData) {
  await requireAdmin();
  const requestId = String(formData.get('requestId') ?? '');
  const checked = validateRejectionReason(formData.get('reason'));
  if (!checked.ok) redirect(`/worker-approvals/${requestId}/reject?error=${encodeURIComponent(checked.error)}`);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('reject_worker_submission', { p_request_id: requestId, p_reason: checked.value });
  if (error) redirect(`/worker-approvals/${requestId}?error=${encodeURIComponent(messageFor(error))}`);
  revalidatePath('/');
  revalidatePath('/worker-approvals');
  revalidatePath(`/worker-approvals/${requestId}`);
  redirect(`/worker-approvals/${requestId}?success=Solicitud+rechazada.`);
}
