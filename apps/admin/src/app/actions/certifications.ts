'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { certificationDecisionMessage } from '@/lib/certification';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function safeId(value: FormDataEntryValue | null) {
  const id = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : '';
}

async function decide(formData: FormData, decision: 'approve' | 'reject') {
  await requireAdmin();
  const membershipId = safeId(formData.get('membershipId'));
  if (!membershipId) redirect('/certifications?error=Solicitud+inválida.');
  const supabase = await createSupabaseServerClient();
  const rpc = decision === 'approve' ? 'approve_certification_request' : 'reject_certification_request';
  const { error } = await supabase.rpc(rpc, { p_membership_id: membershipId });
  if (error) redirect(`/certifications/${membershipId}?error=${encodeURIComponent(certificationDecisionMessage(error.message))}`);
  revalidatePath('/certifications');
  revalidatePath(`/certifications/${membershipId}`);
  redirect(`/certifications/${membershipId}?success=${encodeURIComponent(decision === 'approve' ? 'Certificación aprobada por 12 meses.' : 'Solicitud de certificación rechazada.')}`);
}

export async function approveCertification(formData: FormData) { await decide(formData, 'approve'); }
export async function rejectCertification(formData: FormData) { await decide(formData, 'reject'); }

