import type { CertificationStatus } from '@/lib/certification-types';

export const certificationStatusLabels: Record<CertificationStatus, string> = {
  pending_payment: 'Pendiente de verificación',
  active: 'Activa',
  expired: 'Vencida',
  cancelled: 'Rechazada',
};

export function isCertificationStatus(value: unknown): value is CertificationStatus {
  return typeof value === 'string' && ['pending_payment', 'active', 'expired', 'cancelled'].includes(value);
}

export function canDecideCertification(status: CertificationStatus) {
  return status === 'pending_payment';
}

export function formatCertificationPrice(value: number | string) {
  const price = Number(value);
  return Number.isFinite(price) ? `Bs ${new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(price)}` : '—';
}

export function certificationDecisionMessage(message: string | undefined) {
  if (/already reviewed|stale/i.test(message ?? '')) return 'La solicitud ya fue procesada o cambió de estado.';
  if (/no longer eligible/i.test(message ?? '')) return 'El trabajador ya no cumple los requisitos de certificación.';
  if (/administrator/i.test(message ?? '')) return 'No tienes autorización para revisar certificaciones.';
  return 'No pudimos procesar la certificación. Actualiza la página e inténtalo nuevamente.';
}

