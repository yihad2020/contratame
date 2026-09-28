import { redirect } from 'next/navigation';

import { signIn } from '@/app/actions/auth';
import { getAdminAuthState } from '@/lib/auth';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const state = await getAdminAuthState();
  if (state.user && state.isAdmin) redirect('/');
  if (state.user) redirect('/access-denied');
  const { error } = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">Contrátame!</div>
        <p className="eyebrow">ADMINISTRACIÓN</p>
        <h1>Iniciar sesión</h1>
        <p className="muted">Acceso exclusivo para personal autorizado.</p>
        {error ? <p className="alert error" role="alert">{error}</p> : null}
        <form action={signIn} className="form-stack">
          <label>Correo electrónico<input autoComplete="email" name="email" required type="email" /></label>
          <label>Contraseña<input autoComplete="current-password" name="password" required type="password" /></label>
          <button className="button primary" type="submit">Ingresar</button>
        </form>
      </section>
    </main>
  );
}
