import Link from 'next/link';
import { dismissReport, resolveReport, startReportReview } from '@/app/actions/reports';
import { formatDate } from '@/lib/format';
import { reportReasonLabels, reportStatusLabels } from '@/lib/moderation';
import { getReport } from '@/lib/reports';

export default async function ReportDetailPage({ params, searchParams }: { params: Promise<{ reportId: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { reportId } = await params; const query = await searchParams; const report = await getReport(reportId);
  const actionable = report.status === 'open' || report.status === 'under_review';
  return <div className="page-stack">
    <Link className="back-link" href="/reports">← Volver a reportes</Link>
    <header className="page-header split"><div><p className="eyebrow">REPORTE</p><h1>{reportReasonLabels[report.reason]}</h1><p className="muted">Creado {formatDate(report.created_at)}</p></div><span className={`status ${report.status}`}>{reportStatusLabels[report.status]}</span></header>
    {query.error ? <p className="alert error" role="alert">{query.error}</p> : null}{query.success ? <p className="alert success" role="status">{query.success}</p> : null}
    <section className="detail-card"><h2>Participantes</h2><dl className="data-grid"><div><dt>Reporta</dt><dd>{report.reporter_display_name}</dd></div><div><dt>Perfil reportado</dt><dd>{report.reported_display_name}</dd></div><div><dt>Contexto</dt><dd>{report.booking_id ? 'Contratación' : 'Perfil público'}</dd></div><div><dt>Booking</dt><dd>{report.booking_id ?? '—'}</dd></div></dl></section>
    {report.booking_id ? <section className="detail-card"><h2>Contratación</h2><dl className="data-grid"><div><dt>Servicio</dt><dd>{report.booking_service_title ?? '—'}</dd></div><div><dt>Estado</dt><dd>{report.booking_status ?? '—'}</dd></div></dl></section> : null}
    <section className="detail-card"><h2>Descripción enviada</h2><p>{report.description}</p></section>
    {report.reviewed_at ? <section className="detail-card"><h2>Revisión administrativa</h2><dl className="data-grid"><div><dt>Última revisión</dt><dd>{formatDate(report.reviewed_at)}</dd></div><div><dt>Administrador</dt><dd>{report.reviewed_by_profile_id}</dd></div></dl>{report.resolution_notes ? <><h2>Notas de resolución</h2><p>{report.resolution_notes}</p></> : null}</section> : null}
    {actionable ? <section className="detail-card"><h2>Moderación</h2><p className="muted">La decisión queda auditada. MOD-12 no aplica sanciones automáticas.</p>{report.status === 'open' ? <form action={startReportReview}><input name="reportId" type="hidden" value={report.report_id} /><button className="button secondary" type="submit">Marcar en revisión</button></form> : null}<form className="form-stack"><input name="reportId" type="hidden" value={report.report_id} /><label>Notas de resolución<textarea name="resolutionNotes" required rows={5} /><small className="muted">Entre 10 y 1.000 caracteres.</small></label><div className="button-row"><button className="button danger-outline" formAction={dismissReport} type="submit">Desestimar</button><button className="button success" formAction={resolveReport} type="submit">Resolver</button></div></form></section> : <p className="alert neutral">Este reporte es terminal e inmutable.</p>}
  </div>;
}

