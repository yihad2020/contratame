import { supabase } from '@/lib/supabase';
import {
  attachPortfolioSignedUrls,
  normalizePublicWorkerId,
  normalizePublicWorkerProfile,
} from '@/modules/public-worker/public-worker-model';
import type {
  PortfolioSignedUrl,
  PublicWorkerProfileLoad,
  PublicWorkerProfileRpcRow,
} from '@/modules/public-worker/types';

const PORTFOLIO_BUCKET = 'worker-portfolio';
const SIGNED_URL_TTL_SECONDS = 300;

export async function loadPublicWorkerProfile(workerId: string): Promise<PublicWorkerProfileLoad | null> {
  const normalizedWorkerId = normalizePublicWorkerId(workerId);
  if (!normalizedWorkerId) return null;

  const { data, error } = await supabase
    .rpc('get_public_worker_profile', { p_worker_id: normalizedWorkerId })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const profile = normalizePublicWorkerProfile(data as PublicWorkerProfileRpcRow);
  if (profile.portfolio.length === 0) return { profile, portfolioImageWarning: false };

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
    };
  } catch (cause) {
    if (__DEV__) console.warn('[MOD-05] portfolio signed URLs unavailable', cause);
    return { profile, portfolioImageWarning: true };
  }
}
