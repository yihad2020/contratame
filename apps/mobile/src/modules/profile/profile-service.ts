import { supabase } from '@/lib/supabase';
import type { ProfileInput } from '@/modules/auth/validation';
import { isProfile, type AccountStatus, type Profile } from '@/types/profile';

const PROFILE_COLUMNS = 'id,first_name,last_name,phone,avatar_path,account_status,created_at,updated_at';

export async function getOwnAccountStatus(): Promise<AccountStatus> {
  const { data, error } = await supabase.rpc('get_my_account_status');
  if (error) throw error;
  if (!['active', 'suspended', 'deactivated'].includes(String(data))) {
    throw new Error('No se pudo validar el estado de la cuenta.');
  }
  return data as AccountStatus;
}

export async function getOwnProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
  if (error) throw error;
  if (data === null) return null;
  if (!isProfile(data)) throw new Error('El perfil recibido no cumple el contrato de MOD-01.');
  return data;
}

export async function updateOwnProfile(input: ProfileInput): Promise<Profile> {
  const { data, error } = await supabase.rpc('update_my_profile', {
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_phone: input.phone || null,
  });
  if (error) throw error;
  if (!isProfile(data)) throw new Error('No se pudo validar el perfil actualizado.');
  return data;
}
