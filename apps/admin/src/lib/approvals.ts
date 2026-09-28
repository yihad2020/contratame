import { notFound } from 'next/navigation';

import type { AccountSummary, ApprovalListItem, ApprovalRequest, ApprovalStatus, SnapshotPortfolio } from '@/lib/approval-types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const REQUEST_COLUMNS = 'id,worker_id,status,profile_snapshot,submitted_at,reviewed_at,reviewed_by_profile_id,rejection_reason,created_at';

function asRequests(value: unknown): ApprovalRequest[] {
  return Array.isArray(value) ? value as ApprovalRequest[] : [];
}

export async function getApprovalCounts() {
  const supabase = await createSupabaseServerClient();
  const [pending, reviewed] = await Promise.all([
    supabase.from('worker_approval_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('worker_approval_requests').select('id', { count: 'exact', head: true }).in('status', ['approved', 'rejected']),
  ]);
  if (pending.error) throw pending.error;
  if (reviewed.error) throw reviewed.error;
  return { pending: pending.count ?? 0, reviewed: reviewed.count ?? 0 };
}

export async function listApprovalRequests(status: ApprovalStatus): Promise<ApprovalListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('worker_approval_requests').select(REQUEST_COLUMNS).eq('status', status).order('submitted_at', { ascending: false });
  if (error) throw error;
  const requests = asRequests(data);
  const workerIds = [...new Set(requests.map((request) => request.worker_id))];
  if (!workerIds.length) return [];
  const workers = await supabase.from('worker_profiles').select('id,profile_id').in('id', workerIds);
  if (workers.error) throw workers.error;
  const profileIds = (workers.data ?? []).map((worker) => worker.profile_id);
  const profiles = profileIds.length
    ? await supabase.from('profiles').select('id,first_name,last_name').in('id', profileIds)
    : { data: [], error: null };
  if (profiles.error) throw profiles.error;
  const profileById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile as AccountSummary & { id: string }]));
  const accountByWorker = new Map((workers.data ?? []).map((worker) => [worker.id, profileById.get(worker.profile_id) ?? null]));
  return requests.map((request) => ({ ...request, account: accountByWorker.get(request.worker_id) ?? null }));
}

export async function getApprovalDetail(requestId: string) {
  const supabase = await createSupabaseServerClient();
  const result = await supabase.from('worker_approval_requests').select(REQUEST_COLUMNS).eq('id', requestId).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) notFound();
  const request = result.data as ApprovalRequest;
  const worker = await supabase.from('worker_profiles').select('id,profile_id,approval_status').eq('id', request.worker_id).single();
  if (worker.error) throw worker.error;
  const profile = await supabase.from('profiles').select('first_name,last_name').eq('id', worker.data.profile_id).single();
  if (profile.error) throw profile.error;
  const history = await supabase.from('worker_approval_requests').select(REQUEST_COLUMNS).eq('worker_id', request.worker_id).order('submitted_at', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false });
  if (history.error) throw history.error;
  const portfolio = await signSnapshotPortfolio(request.worker_id, request.profile_snapshot.portfolio ?? []);
  return {
    request: { ...request, profile_snapshot: { ...request.profile_snapshot, portfolio } },
    workerStatus: worker.data.approval_status as string,
    account: profile.data as AccountSummary,
    history: asRequests(history.data),
  };
}

async function signSnapshotPortfolio(workerId: string, items: SnapshotPortfolio[]) {
  const supabase = await createSupabaseServerClient();
  return Promise.all(items.map(async (item) => {
    const path = item.storage_path;
    if (!path || !path.startsWith(`${workerId}/`) || !/\/image\.(jpe?g|png|webp)$/i.test(path)) return item;
    const { data, error } = await supabase.storage.from('worker-portfolio').createSignedUrl(path, 300);
    return error ? item : { ...item, signedUrl: data.signedUrl };
  }));
}
