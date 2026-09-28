import Link from 'next/link';

import { rejectRequest } from '@/app/actions/approvals';
import { getApprovalDetail } from '@/lib/approvals';

export default async function RejectPage({ params, searchParams }: { params: Promise<{ requestId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { requestId } = await params;
  const query = await searchParams;
  const { request, workerStatus, account, history } = await getApprovalDetail(requestId);
  const canAct = request.status === 'pending' && workerStatus === 'pending_approval' && history[0]?.id === request.id;
  return (
    <div className="page-stack narrow">
      <Link className="back-link" href={`/worker-approvals/${request.id}`}>← Volver a la solicitud</Link>
      <section className="confirmation-card">
        <p className="eyebrow">CONFIRMAR DECISIÓN</p>
        <h1>Rechazar solicitud</h1>
        <p><strong>{account.first_name} {account.last_name}</strong></p>
        <p className="muted">Este mensaje será visible para el trabajador y debe explicar qué necesita corregir.</p>
        {query.error ? <p className="alert error" role="alert">{query.error}</p> : null}
        {canAct ? <form action={rejectRequest} className="form-stack"><input name="requestId" type="hidden" value={request.id} /><label>Motivo *<textarea maxLength={500} minLength={10} name="reason" required rows={7} /></label><p className="field-help">Entre 10 y 500 caracteres.</p><div className="button-row"><Link className="button secondary" href={`/worker-approvals/${request.id}`}>Cancelar</Link><button className="button danger" type="submit">Rechazar solicitud</button></div></form> : <p className="alert neutral">Esta solicitud ya no puede procesarse.</p>}
      </section>
    </div>
  );
}
