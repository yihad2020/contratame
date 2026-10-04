import { supabase } from '@/lib/supabase';
import {
  attachPortfolioSignedUrls,
  normalizePublicWorkerId,
  normalizePublicWorkerProfile,
} from '@/modules/public-worker/public-worker-model';
import type {
  PortfolioSignedUrl,
  PublicWorkerProfile,
  PublicWorkerProfileLoad,
  PublicWorkerProfileRpcRow,
} from '@/modules/public-worker/types';
import { getPublicWorkerReputation } from '@/modules/review/review-service';

const PORTFOLIO_BUCKET = 'worker-portfolio';
const SIGNED_URL_TTL_SECONDS = 300;

export async function loadPublicWorkerRequestContext(workerId: string): Promise<PublicWorkerProfile | null> {
  const normalizedWorkerId = normalizePublicWorkerId(workerId);
  if (!normalizedWorkerId) return null;

  const { data, error } = await supabase
    .rpc('get_public_worker_profile', { p_worker_id: normalizedWorkerId })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return normalizePublicWorkerProfile(data as PublicWorkerProfileRpcRow);
}

export async function loadPublicWorkerProfile(workerId: string): Promise<PublicWorkerProfileLoad | null> {
  const profile = await loadPublicWorkerRequestContext(workerId);
  if (!profile) return null;
  const reputation = await getPublicWorkerReputation(profile.worker_id) ?? {
    worker_id: profile.worker_id,
    average_rating: null,
    review_count: 0,
    reviews: [],
  };

  if (profile.portfolio.length === 0) return { profile, portfolioImageWarning: false, reputation };

  const paths = profile.portfolio.map((item) => item.storage_path);
  try {
    const signed = await supabase.storage
      .from(PORTFOLIO_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (signed.error || !signed.data) throw signed.error ?? new Error('Portfolio URL signing failed');
    const attached = attachPortfolioSignedUrls(profile.portfolio, signed.data as PortfolioSignedUrl[]);
    return {
      profile: { ...profile, portfolio: attached.portfolio },
      portfolioImageWarning: attached.hasFailures,
      reputation,
    };
  } catch (cause) {
    if (__DEV__) console.warn('[MOD-05] portfolio signed URLs unavailable', cause);
    return { profile, portfolioImageWarning: true, reputation };
  }
}
