import Link from 'next/link';
import type { ReactNode } from 'react';

import { signOut } from '@/app/actions/auth';
import { requireAdmin } from '@/lib/auth';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div><div className="brand-mark inverted">Contrátame!</div><p className="sidebar-label">Administración</p></div>
        <nav><Link href="/">Resumen</Link><Link href="/worker-approvals">Solicitudes</Link></nav>
        <div className="sidebar-footer"><span>{user.email}</span><form action={signOut}><button className="text-button" type="submit">Cerrar sesión</button></form></div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
