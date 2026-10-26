import { notFound } from 'next/navigation';
import type { AdminCertification, CertificationStatus } from '@/lib/certification-types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function asCertifications(value: unknown): AdminCertification[] {
  return Array.isArray(value) ? value as AdminCertification[] : [];
}

export async function listCertifications(
  status: CertificationStatus | null,
  beforeCreatedAt: string | null,
  beforeMembershipId: string | null,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('list_admin_certification_requests', {
    p_status: status,
    p_before_created_at: beforeCreatedAt,
    p_before_membership_id: beforeMembershipId,
    p_limit: 31,
  });
  if (error) throw error;
  const rows = asCertifications(data);
  return { certifications: rows.slice(0, 30), hasMore: rows.length > 30 };
}

export async function getCertification(membershipId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_admin_certification_request', {
    p_membership_id: membershipId,
  }).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return data as AdminCertification;
}

