export type AccountStatus = 'active' | 'suspended' | 'deactivated';

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_path: string | null;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
};

export function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.first_name === 'string' &&
    typeof row.last_name === 'string' && (row.phone === null || typeof row.phone === 'string') &&
    (row.avatar_path === null || typeof row.avatar_path === 'string') &&
    ['active', 'suspended', 'deactivated'].includes(String(row.account_status)) &&
    typeof row.created_at === 'string' && typeof row.updated_at === 'string';
}
