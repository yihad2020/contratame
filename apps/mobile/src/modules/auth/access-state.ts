import type { Profile } from '@/types/profile';
export type AccessState = 'loading' | 'signedOut' | 'verificationRequired' | 'active' | 'suspended' | 'deactivated' | 'profileMissing' | 'error';
export function deriveAccessState(input: { hasSession: boolean; emailConfirmed: boolean; profile: Profile | null }): AccessState {
  if (!input.hasSession) return 'signedOut';
  if (!input.emailConfirmed) return 'verificationRequired';
  if (!input.profile) return 'profileMissing';
  return input.profile.account_status;
}

export function shouldShowEmailVerification(state: AccessState) {
  return state === 'verificationRequired';
}
