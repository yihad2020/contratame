import { deriveAccessState, shouldShowEmailVerification } from '@/modules/auth/access-state';
import type { Profile } from '@/types/profile';

const profile: Profile = { id: 'user-a', first_name: 'Ana', last_name: 'Pérez', phone: null, avatar_path: null, account_status: 'active', created_at: '2026-09-10T00:00:00Z', updated_at: '2026-09-10T00:00:00Z' };

describe('frontera de acceso MOD-01', () => {
  it('mantiene fuera a quien no tiene sesión', () => expect(deriveAccessState({ hasSession: false, emailConfirmed: false, profile: null })).toBe('signedOut'));
  it('exige correo confirmado', () => expect(deriveAccessState({ hasSession: true, emailConfirmed: false, profile: null })).toBe('verificationRequired'));
  it('falla de forma cerrada si falta el perfil', () => expect(deriveAccessState({ hasSession: true, emailConfirmed: true, profile: null })).toBe('profileMissing'));
  it.each(['active', 'suspended', 'deactivated'] as const)('refleja el estado %s', (account_status) => {
    expect(deriveAccessState({ hasSession: true, emailConfirmed: true, profile: { ...profile, account_status } })).toBe(account_status);
  });

  it('solo mantiene visible la pantalla de verificación durante verificationRequired', () => {
    expect(shouldShowEmailVerification('verificationRequired')).toBe(true);
    expect(shouldShowEmailVerification('active')).toBe(false);
    expect(shouldShowEmailVerification('suspended')).toBe(false);
    expect(shouldShowEmailVerification('deactivated')).toBe(false);
    expect(shouldShowEmailVerification('profileMissing')).toBe(false);
    expect(shouldShowEmailVerification('error')).toBe(false);
  });
});
