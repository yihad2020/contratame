import Link from 'next/link';
import { certificationStatusLabels, formatCertificationPrice, isCertificationStatus } from '@/lib/certification';
import type { CertificationStatus } from '@/lib/certification-types';
import { listCertifications } from '@/lib/certifications';
import { formatDate } from '@/lib/format';

const statuses: { value: CertificationStatus | null; label: string }[] = [
  { value: null, label: 'Todas' },
  { value: 'pending_payment', label: 'Pendientes' },
  { value: 'active', label: 'Activas' },
  { value: 'expired', label: 'Vencidas' },
  { value: 'cancelled', label: 'Rechazadas' },
];

export default async function CertificationsPage({ searchParams }: {
  searchParams: Promise<{ status?: string; beforeCreatedAt?: string; beforeMembershipId?: string; error?: string }>;
}) {
  const query = await searchParams;
  const status = isCertificationStatus(query.status) ? query.status : null;
  const validCursor = typeof query.beforeCreatedAt === 'string'
    && !Number.isNaN(Date.parse(query.beforeCreatedAt))
    && typeof query.beforeMembershipId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.beforeMembershipId);
  const { certifications, hasMore } = await listCertifications(
    status,
    validCursor ? query.beforeCreatedAt ?? null : null,
    validCursor ? query.beforeMembershipId ?? null : null,
  );
  const last = certifications.at(-1);
  const next = last ? `/certifications?${new URLSearchParams({
    ...(status ? { status } : {}), beforeCreatedAt: last.created_at, beforeMembershipId: last.membership_id,
  })}` : null;

  return <div className="page-stack">
    <header className="page-header"><div><p className="eyebrow">MOD-13</p><h1>Certificaciones</h1><p className="muted">Verificación manual interna de Contrátame. Precio registrado: Bs 50.</p></div></header>
    {query.error ? <p className="alert error">{query.error}</p> : null}
    <nav className="filter-tabs" aria-label="Estado de certificaciones">{statuses.map((item) => <Link className={status === item.value ? 'active' : ''} href={item.value ? `/certifications?status=${item.value}` : '/certifications'} key={item.label}>{item.label}</Link>)}</nav>
    {certifications.length ? <div className="table-wrap"><table><thead><tr><th>Trabajador</th><th>Precio</th><th>Solicitud</th><th>Vigencia</th><th>Estado</th><th /></tr></thead><tbody>{certifications.map((item) => <tr key={item.membership_id}><td><strong>{item.worker_display_name}</strong><small>{item.worker_id}</small></td><td>{formatCertificationPrice(item.price_bob)}</td><td>{formatDate(item.created_at)}</td><td>{item.expires_at ? formatDate(item.expires_at) : '—'}</td><td><span className={`status ${item.certification_status}`}>{certificationStatusLabels[item.certification_status]}</span></td><td><Link className="row-link" href={`/certifications/${item.membership_id}`}>Revisar</Link></td></tr>)}</tbody></table></div> : <section className="empty-state"><h2>No hay certificaciones</h2><p className="muted">No existen registros con este filtro.</p></section>}
    {hasMore && next ? <Link className="button secondary" href={next}>Página siguiente</Link> : null}
  </div>;
}

