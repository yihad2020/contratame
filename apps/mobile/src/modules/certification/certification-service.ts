import { supabase } from '@/lib/supabase';
import { indexPublicCertifications, normalizeCertificationState } from '@/modules/certification/certification-model';
import type {
  CertificationState,
  CertificationStateRpcRow,
  PublicWorkerCertification,
} from '@/modules/certification/types';

export async function loadOwnCertificationState(): Promise<CertificationState> {
  const { data, error } = await supabase.rpc('get_my_worker_certification_state').single();
  if (error) throw error;
  return normalizeCertificationState(data as CertificationStateRpcRow);
}

export async function requestCertification(): Promise<CertificationState> {
  const { error } = await supabase.rpc('request_worker_certification');
  if (error) throw error;
  return loadOwnCertificationState();
}

export async function loadPublicWorkerCertifications(workerIds: string[]) {
  const uniqueIds = [...new Set(workerIds)];
  if (!uniqueIds.length) return new Map<string, PublicWorkerCertification>();
  const { data, error } = await supabase.rpc('get_public_worker_certifications', {
    p_worker_ids: uniqueIds,
  });
  if (error) throw error;
  return indexPublicCertifications((data ?? []) as PublicWorkerCertification[]);
}

