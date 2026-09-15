import type { Session, User } from '@supabase/supabase-js';

import { getFreshVerificationState, type VerificationAuthClient } from '@/modules/auth/verification';

const staleSession = {
  user: { id: 'user-a', email: 'ana@example.com', email_confirmed_at: null },
} as unknown as Session;

const freshConfirmedUser = {
  id: 'user-a',
  email: 'ana@example.com',
  email_confirmed_at: '2026-09-10T12:00:00Z',
} as User;

function authClient(user: User | null, session: Session | null = staleSession) {
  return {
    getSession: jest.fn().mockResolvedValue({ data: { session }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
  } as unknown as VerificationAuthClient;
}

describe('verificación fresca de correo', () => {
  it('usa getUser y reconoce confirmación aunque session.user siga obsoleto', async () => {
    const auth = authClient(freshConfirmedUser);

    const result = await getFreshVerificationState(auth);

    expect(result.confirmed).toBe(true);
    expect(result.user).toBe(freshConfirmedUser);
    expect(result.session?.user.email_confirmed_at).toBeNull();
    expect(auth.getUser).toHaveBeenCalledTimes(1);
  });

  it('mantiene el estado no confirmado según el usuario fresco', async () => {
    const auth = authClient({ ...freshConfirmedUser, email_confirmed_at: undefined });
    await expect(getFreshVerificationState(auth)).resolves.toMatchObject({ confirmed: false });
  });

  it('no consulta el usuario remoto cuando no existe sesión', async () => {
    const auth = authClient(null, null);
    await expect(getFreshVerificationState(auth)).resolves.toEqual({ confirmed: false, session: null, user: null });
    expect(auth.getUser).not.toHaveBeenCalled();
  });
});
