import Link from 'next/link';
import { approveCertification, rejectCertification } from '@/app/actions/certifications';
import { canDecideCertification, certificationStatusLabels, formatCertificationPrice } from '@/lib/certification';
import { getCertification } from '@/lib/certifications';
import { formatDate } from '@/lib/format';

export default async function CertificationDetailPage({ params, searchParams }: {
  params: Promise<{ membershipId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { membershipId } = await params;
  const query = await searchParams;
  const certification = await getCertification(membershipId);
  const actionable = canDecideCertification(certification.certification_status);

  return <div className="page-stack">
    <Link className="back-link" href="/certifications">← Volver a certificaciones</Link>
    <header className="page-header split"><div><p className="eyebrow">VERIFICACIÓN DE CONTRÁTAME</p><h1>{certification.worker_display_name}</h1><p className="muted">Solicitud creada {formatDate(certification.created_at)}</p></div><span className={`status ${certification.certification_status}`}>{certificationStatusLabels[certification.certification_status]}</span></header>
    {query.error ? <p className="alert error" role="alert">{query.error}</p> : null}
    {query.success ? <p className="alert success" role="status">{query.success}</p> : null}
    <section className="detail-card"><h2>Trabajador</h2><dl className="data-grid"><div><dt>Nombre</dt><dd>{certification.worker_display_name}</dd></div><div><dt>Worker</dt><dd>{certification.worker_id}</dd></div><div><dt>Perfil profesional</dt><dd>{certification.worker_approval_status}</dd></div><div><dt>Cuenta</dt><dd>{certification.account_status}</dd></div></dl></section>
    <section className="detail-card"><h2>Certificación</h2><dl className="data-grid"><div><dt>Precio</dt><dd>{formatCertificationPrice(certification.price_bob)}</dd></div><div><dt>Proceso</dt><dd>Verificación administrativa manual</dd></div><div><dt>Inicio</dt><dd>{certification.starts_at ? formatDate(certification.starts_at) : '—'}</dd></div><div><dt>Vencimiento</dt><dd>{certification.expires_at ? formatDate(certification.expires_at) : '—'}</dd></div></dl><p className="privacy-note">No existe pago electrónico, evidencia adjunta ni acreditación externa en MOD-13.</p></section>
    {actionable ? <section className="decision-bar"><div><strong>Decisión administrativa</strong><p>Confirma externamente el proceso manual antes de aprobar. La aprobación activa 12 meses de vigencia.</p><p>El esquema congelado no admite guardar una razón de rechazo.</p></div><div className="button-row"><form action={rejectCertification}><input name="membershipId" type="hidden" value={certification.membership_id} /><button className="button danger-outline" type="submit">Rechazar</button></form><form action={approveCertification}><input name="membershipId" type="hidden" value={certification.membership_id} /><button className="button success" type="submit">Aprobar por 12 meses</button></form></div></section> : <p className="alert neutral">Esta decisión es histórica y ya no admite otra transición.</p>}
  </div>;
}

