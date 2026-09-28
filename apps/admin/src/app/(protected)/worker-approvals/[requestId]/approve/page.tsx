import Link from 'next/link';

import { approveRequest } from '@/app/actions/approvals';
import { getApprovalDetail } from '@/lib/approvals';

export default async function ApprovePage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const { request, workerStatus, account, history } = await getApprovalDetail(requestId);
  const canAct = request.status === 'pending' && workerStatus === 'pending_approval' && history[0]?.id === request.id;
  return (
    <div className="page-stack narrow">
      <Link className="back-link" href={`/worker-approvals/${request.id}`}>← Volver a la solicitud</Link>
      <section className="confirmation-card">
        <p className="eyebrow">CONFIRMAR DECISIÓN</p>
        <h1>Aprobar perfil profesional</h1>
        <p><strong>{account.first_name} {account.last_name}</strong></p>
        <p>Este trabajador podrá ser visible en Contrátame! después de la aprobación.</p>
        {canAct ? <form action={approveRequest}><input name="requestId" type="hidden" value={request.id} /><div className="button-row"><Link className="button secondary" href={`/worker-approvals/${request.id}`}>Cancelar</Link><button className="button success" type="submit">Confirmar aprobación</button></div></form> : <p className="alert neutral">Esta solicitud ya no puede procesarse.</p>}
      </section>
    </div>
  );
}
