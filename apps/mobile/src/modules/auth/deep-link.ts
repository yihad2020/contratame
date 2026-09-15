import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
export const EMAIL_REDIRECT_URL = 'contratame://verify-email';
export async function establishSessionFromUrl(url: string): Promise<Session | null> {
  const parsed = new URL(url.replace('#', '?'));
  const code = parsed.searchParams.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }
  const accessToken = parsed.searchParams.get('access_token');
  const refreshToken = parsed.searchParams.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw error;
  return data.session;
}
