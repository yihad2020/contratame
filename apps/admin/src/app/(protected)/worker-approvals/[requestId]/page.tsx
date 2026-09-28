import Link from 'next/link';

import { getApprovalDetail } from '@/lib/approvals';
import { formatDate, pricingLabel, statusLabel, weekdayLabels } from '@/lib/format';

export default async function ApprovalDetailPage({ params, searchParams }: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { requestId } = await params;
  const query = await searchParams;
  const { request, workerStatus, account, history } = await getApprovalDetail(requestId);
  const snapshot = request.profile_snapshot;
  const canAct = request.status === 'pending' && workerStatus === 'pending_approval' && history[0]?.id === request.id;
  const coordinates = snapshot.location?.private_location_geojson?.coordinates;

  return (
    <div className="page-stack">
      <Link className="back-link" href="/worker-approvals">← Volver a solicitudes</Link>
      <header className="page-header split"><div><p className="eyebrow">SOLICITUD</p><h1>{account.first_name} {account.last_name}</h1><p className="muted">Enviada {formatDate(request.submitted_at)}</p></div><span className={`status ${request.status}`}>{statusLabel(request.status)}</span></header>
      {query.error ? <p className="alert error" role="alert">{query.error}</p> : null}
      {query.success ? <p className="alert success" role="status">{query.success}</p> : null}
      {!canAct && request.status !== 'pending' ? <p className="alert neutral">Esta solicitud ya fue revisada.</p> : null}
      {!canAct && request.status === 'pending' ? <p className="alert neutral">Esta solicitud ya no es la solicitud pendiente actual.</p> : null}

      <section className="detail-card"><h2>Trabajador y envío</h2><dl className="data-grid"><div><dt>Nombre</dt><dd>{account.first_name} {account.last_name}</dd></div><div><dt>Solicitud</dt><dd>{request.id}</dd></div><div><dt>Estado actual del perfil</dt><dd>{workerStatus}</dd></div><div><dt>Fecha de envío</dt><dd>{formatDate(request.submitted_at)}</dd></div></dl></section>

      <section className="detail-card"><h2>Perfil profesional</h2><p>{snapshot.professional_profile?.bio ?? 'Sin biografía en la instantánea.'}</p><p className="muted">Experiencia: {snapshot.professional_profile?.years_experience ?? '—'} años</p></section>

      <section className="detail-card"><h2>Servicios</h2><div className="item-list">{(snapshot.services ?? []).map((service, index) => <article className="list-item" key={`${service.title}-${index}`}><div><strong>{service.title ?? 'Servicio'}</strong><p>{service.category_name ?? 'Categoría no disponible'} · {pricingLabel(service.pricing_type)}{service.price_bob != null ? ` · Bs ${service.price_bob}` : ''}</p></div>{service.description ? <p>{service.description}</p> : null}</article>)}</div></section>

      <section className="detail-card"><h2>Zona de trabajo</h2><dl className="data-grid"><div><dt>Zona pública</dt><dd>{snapshot.location?.public_area_label ?? '—'}</dd></div><div><dt>Ciudad / departamento</dt><dd>{snapshot.location?.city ?? '—'} / {snapshot.location?.department ?? '—'}</dd></div><div><dt>Radio</dt><dd>{snapshot.location?.service_radius_m ? `${snapshot.location.service_radius_m / 1000} km` : '—'}</dd></div><div><dt>Base privada para revisión</dt><dd>{coordinates ? `${coordinates[1]}, ${coordinates[0]}` : 'No disponible'}</dd></div></dl><p className="privacy-note">La coordenada exacta es privada y solo se muestra en este acceso administrativo autorizado.</p></section>

      <section className="detail-card"><h2>Disponibilidad</h2><div className="compact-list">{(snapshot.availability ?? []).map((range, index) => <span key={index}>{weekdayLabels[range.day_of_week ?? -1] ?? 'Día'} · {range.start_time?.slice(0, 5) ?? '—'}–{range.end_time?.slice(0, 5) ?? '—'}</span>)}</div></section>

      <section className="detail-card"><h2>Portafolio</h2>{snapshot.portfolio?.length ? <div className="portfolio-grid">{snapshot.portfolio.map((item, index) => <article key={`${item.storage_path}-${index}`}>{item.signedUrl ? <img alt={item.title ?? 'Trabajo del portafolio'} src={item.signedUrl} /> : <div className="image-placeholder">Imagen no disponible</div>}<strong>{item.title ?? 'Trabajo'}</strong>{item.description ? <p>{item.description}</p> : null}</article>)}</div> : <p className="muted">La solicitud no incluye trabajos de portafolio.</p>}</section>

      <section className="detail-card"><h2>Historial</h2><div className="history-list">{history.map((item, index) => <article key={item.id}><div><strong>Envío #{history.length - index}</strong><p>{formatDate(item.submitted_at)}</p></div><div><span className={`status ${item.status}`}>{statusLabel(item.status)}</span><p>{item.reviewed_at ? `Revisada ${formatDate(item.reviewed_at)}` : 'Sin revisar'}</p>{item.rejection_reason ? <p className="rejection-copy">{item.rejection_reason}</p> : null}</div></article>)}</div></section>

      {canAct ? <section className="decision-bar"><div><strong>Decisión administrativa</strong><p>La decisión se aplica a esta instantánea y no modifica su contenido.</p></div><div className="button-row"><Link className="button danger-outline" href={`/worker-approvals/${request.id}/reject`}>Rechazar</Link><Link className="button success" href={`/worker-approvals/${request.id}/approve`}>Aprobar</Link></div></section> : null}
    </div>
  );
}
