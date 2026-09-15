import type { SupabaseClient } from '@supabase/supabase-js';

export type VerificationAuthClient = Pick<SupabaseClient['auth'], 'getSession' | 'getUser'>;

export async function getFreshVerificationState(auth: VerificationAuthClient) {
  const { data: sessionData, error: sessionError } = await auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) {
    return { confirmed: false, session: null, user: null };
  }

  const { data: userData, error: userError } = await auth.getUser();
  if (userError) throw userError;

  return {
    confirmed: Boolean(userData.user.email_confirmed_at),
    session: sessionData.session,
    user: userData.user,
  };
}
