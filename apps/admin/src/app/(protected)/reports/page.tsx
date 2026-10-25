import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { reportReasonLabels, reportStatusLabels } from '@/lib/moderation';
import type { ReportStatus } from '@/lib/report-types';
import { listReports } from '@/lib/reports';

const statuses: { value: ReportStatus | null; label: string }[] = [{ value: null, label: 'Todos' }, { value: 'open', label: 'Abiertos' }, { value: 'under_review', label: 'En revisión' }, { value: 'resolved', label: 'Resueltos' }, { value: 'dismissed', label: 'Desestimados' }];
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; beforeCreatedAt?: string; beforeReportId?: string; error?: string }> }) {
  const query = await searchParams;
  const status = statuses.some((item) => item.value === query.status) ? query.status as ReportStatus : null;
  const validCursor = typeof query.beforeCreatedAt === 'string'
    && !Number.isNaN(Date.parse(query.beforeCreatedAt))
    && typeof query.beforeReportId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.beforeReportId);
  const { reports, hasMore } = await listReports(
    status,
    validCursor ? query.beforeCreatedAt ?? null : null,
    validCursor ? query.beforeReportId ?? null : null,
  );
  const last = reports.at(-1);
  const next = last ? `/reports?${new URLSearchParams({ ...(status ? { status } : {}), beforeCreatedAt: last.created_at, beforeReportId: last.report_id })}` : null;
  return <div className="page-stack">
    <header className="page-header"><div><p className="eyebrow">MOD-12</p><h1>Reportes de usuarios</h1><p className="muted">Revisión privada sin sanciones automáticas.</p></div></header>
    {query.error ? <p className="alert error">{query.error}</p> : null}
    <nav className="filter-tabs" aria-label="Estado de reportes">{statuses.map((item) => <Link className={status === item.value ? 'active' : ''} href={item.value ? `/reports?status=${item.value}` : '/reports'} key={item.label}>{item.label}</Link>)}</nav>
    {reports.length ? <div className="table-wrap"><table><thead><tr><th>Motivo</th><th>Reporta</th><th>Reportado</th><th>Contexto</th><th>Creado</th><th>Estado</th><th /></tr></thead><tbody>{reports.map((report) => <tr key={report.report_id}><td><strong>{reportReasonLabels[report.reason]}</strong><small>{report.report_id}</small></td><td>{report.reporter_display_name}</td><td>{report.reported_display_name}</td><td>{report.booking_id ? 'Contratación' : 'Perfil público'}</td><td>{formatDate(report.created_at)}</td><td><span className={`status ${report.status}`}>{reportStatusLabels[report.status]}</span></td><td><Link className="row-link" href={`/reports/${report.report_id}`}>Revisar</Link></td></tr>)}</tbody></table></div> : <section className="empty-state"><h2>No hay reportes</h2><p className="muted">No existen reportes con este filtro.</p></section>}
    {hasMore && next ? <Link className="button secondary" href={next}>Página siguiente</Link> : null}
  </div>;
}

