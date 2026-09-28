import Link from 'next/link';

import { getApprovalCounts } from '@/lib/approvals';

export default async function DashboardPage() {
  const counts = await getApprovalCounts();
  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">MOD-03</p><h1>Contrátame! Administración</h1><p className="muted">Revisión de perfiles profesionales.</p></div></header>
      <section className="metric-grid">
        <article className="metric-card"><span>Solicitudes pendientes</span><strong>{counts.pending}</strong><Link className="button primary" href="/worker-approvals?status=pending">Ver solicitudes</Link></article>
        <article className="metric-card"><span>Revisadas</span><strong>{counts.reviewed}</strong><Link className="button secondary" href="/worker-approvals?status=approved">Ver historial</Link></article>
      </section>
    </div>
  );
}
