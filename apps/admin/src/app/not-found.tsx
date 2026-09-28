import Link from 'next/link';

export default function NotFound() {
  return <main className="auth-shell"><section className="auth-card"><h1>Solicitud no encontrada</h1><p className="muted">No existe o ya no está disponible para esta cuenta.</p><Link className="button primary" href="/worker-approvals">Volver a solicitudes</Link></section></main>;
}
