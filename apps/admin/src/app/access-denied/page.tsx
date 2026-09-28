import { redirect } from 'next/navigation';

import { signOut } from '@/app/actions/auth';
import { getAdminAuthState } from '@/lib/auth';

export default async function AccessDeniedPage() {
  const state = await getAdminAuthState();
  if (!state.user) redirect('/login');
  if (state.isAdmin) redirect('/');
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">ACCESO RESTRINGIDO</p>
        <h1>No tienes acceso</h1>
        <p className="muted">Esta cuenta no está autorizada para usar Contrátame! Administración.</p>
        <form action={signOut}><button className="button secondary" type="submit">Cerrar sesión</button></form>
      </section>
    </main>
  );
}
