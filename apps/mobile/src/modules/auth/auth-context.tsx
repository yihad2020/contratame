import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { supabase } from '@/lib/supabase';
import { deriveAccessState, type AccessState } from '@/modules/auth/access-state';
import { EMAIL_REDIRECT_URL, establishSessionFromUrl } from '@/modules/auth/deep-link';
import type { RegistrationInput } from '@/modules/auth/validation';
import { validateRegistration } from '@/modules/auth/validation';
import { getFreshVerificationState } from '@/modules/auth/verification';
import { getOwnAccountStatus, getOwnProfile } from '@/modules/profile/profile-service';
import type { Profile } from '@/types/profile';

type AuthContextValue = {
  state: AccessState; user: User | null; profile: Profile | null; pendingEmail: string | null; errorMessage: string | null;
  signIn(email: string, password: string): Promise<void>; signUp(input: RegistrationInput): Promise<void>; signOut(): Promise<void>;
  resendConfirmation(): Promise<void>; checkVerification(): Promise<boolean>; reloadProfile(): Promise<void>; replaceProfile(profile: Profile): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AccessState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hydrate = useCallback(async (session: Session | null, verifiedUser?: User) => {
    if (!session) { setUser(null); setProfile(null); setState('signedOut'); return; }
    try {
      let currentUser = verifiedUser;
      if (!currentUser) {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        currentUser = data.user;
      }
      setUser(currentUser);
      if (!currentUser.email_confirmed_at) {
        setPendingEmail(currentUser.email ?? null); setState('verificationRequired'); return;
      }
      const accountStatus = await getOwnAccountStatus();
      if (accountStatus !== 'active') {
        setProfile(null); setState(accountStatus); setErrorMessage(null); return;
      }
      const ownProfile = await getOwnProfile(currentUser.id);
      setProfile(ownProfile);
      setState(deriveAccessState({ hasSession: true, emailConfirmed: true, profile: ownProfile }));
      setErrorMessage(null);
    } catch (error) { setErrorMessage(messageFrom(error)); setState('error'); }
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => hydrate(data.session));
    const auth = supabase.auth.onAuthStateChange((_event, session) => { void hydrate(session); });
    const acceptUrl = ({ url }: { url: string }) => { void establishSessionFromUrl(url).then(hydrate).catch((error) => { setErrorMessage(messageFrom(error)); setState('error'); }); };
    const linking = Linking.addEventListener('url', acceptUrl);
    void Linking.getInitialURL().then((url) => { if (url) acceptUrl({ url }); });
    return () => { auth.data.subscription.unsubscribe(); linking.remove(); };
  }, [hydrate]);

  const value = useMemo<AuthContextValue>(() => ({
    state, user, profile, pendingEmail, errorMessage,
    async signIn(email, password) {
      setErrorMessage(null);
      const normalizedEmail = email.trim();
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) {
        if (error.code === 'email_not_confirmed') { setPendingEmail(normalizedEmail); setState('verificationRequired'); return; }
        throw error;
      }
      await hydrate(data.session);
    },
    async signUp(input) {
      const checked = validateRegistration(input);
      if (!checked.ok) throw new Error('Revisa los datos de registro.');
      const { data, error } = await supabase.auth.signUp({
        email: checked.value.email, password: checked.value.password,
        options: { emailRedirectTo: EMAIL_REDIRECT_URL, data: { first_name: checked.value.firstName, last_name: checked.value.lastName, phone: checked.value.phone || null } },
      });
      if (error) throw error;
      setUser(data.user); setPendingEmail(checked.value.email); setState('verificationRequired');
    },
    async signOut() { setPendingEmail(null); setErrorMessage(null); await supabase.auth.signOut(); setState('signedOut'); },
    async resendConfirmation() {
      if (!pendingEmail) throw new Error('No hay un correo pendiente de verificación.');
      const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail, options: { emailRedirectTo: EMAIL_REDIRECT_URL } });
      if (error) throw error;
    },
    async checkVerification() {
      const freshState = await getFreshVerificationState(supabase.auth);
      if (!freshState.session || !freshState.user) return false;
      if (!freshState.confirmed) {
        setUser(freshState.user);
        setPendingEmail(freshState.user.email ?? pendingEmail);
        setState('verificationRequired');
        return false;
      }
      await hydrate(freshState.session, freshState.user);
      return true;
    },
    async reloadProfile() { const { data } = await supabase.auth.getSession(); await hydrate(data.session); },
    replaceProfile(nextProfile) { setProfile(nextProfile); setState(nextProfile.account_status); },
  }), [errorMessage, hydrate, pendingEmail, profile, state, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
