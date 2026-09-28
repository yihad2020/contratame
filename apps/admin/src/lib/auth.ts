import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getAdminAuthState() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { user: null, isAdmin: false };
  const { data, error } = await supabase.rpc('get_my_admin_access');
  return { user, isAdmin: !error && data === true };
}

export async function requireAdmin() {
  const state = await getAdminAuthState();
  if (!state.user) redirect('/login');
  if (!state.isAdmin) redirect('/access-denied');
  return state.user;
}
