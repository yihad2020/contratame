import Link from 'next/link';

import type { ApprovalStatus } from '@/lib/approval-types';
import { listApprovalRequests } from '@/lib/approvals';
import { formatDate, statusLabel } from '@/lib/format';

const filters: { value: ApprovalStatus; label: string }[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
];

export default async function ApprovalListPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const query = await searchParams;
  const status: ApprovalStatus = query.status === 'approved' || query.status === 'rejected' ? query.status : 'pending';
  const requests = await listApprovalRequests(status);

  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">PERFILES PROFESIONALES</p><h1>Solicitudes de aprobación</h1><p className="muted">Revisa exactamente la información enviada por cada trabajador.</p></div></header>
      <nav className="filter-tabs" aria-label="Estado de solicitudes">
        {filters.map((filter) => <Link className={status === filter.value ? 'active' : ''} href={`/worker-approvals?status=${filter.value}`} key={filter.value}>{filter.label}</Link>)}
      </nav>
      {requests.length ? (
        <div className="table-wrap"><table><thead><tr><th>Trabajador</th><th>Enviada</th><th>Ubicación</th><th>Servicios</th><th>Estado</th><th /></tr></thead><tbody>
          {requests.map((request) => {
            const snapshot = request.profile_snapshot;
            const name = request.account ? `${request.account.first_name} ${request.account.last_name}` : 'Cuenta no disponible';
            const location = snapshot.location;
            return <tr key={request.id}><td><strong>{name}</strong><small>{request.id}</small></td><td>{formatDate(request.submitted_at)}</td><td>{location?.city ?? '—'}{location?.department ? `, ${location.department}` : ''}</td><td>{snapshot.services?.length ?? 0}</td><td><span className={`status ${request.status}`}>{statusLabel(request.status)}</span></td><td><Link className="row-link" href={`/worker-approvals/${request.id}`}>Revisar</Link></td></tr>;
          })}
        </tbody></table></div>
      ) : <section className="empty-state"><h2>No hay solicitudes</h2><p className="muted">No existen solicitudes con este estado.</p></section>}
    </div>
  );
}
