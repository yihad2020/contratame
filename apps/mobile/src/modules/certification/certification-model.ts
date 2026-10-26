import type {
  CertificationDisplayState,
  CertificationState,
  CertificationStateRpcRow,
  PublicWorkerCertification,
} from '@/modules/certification/types';

export const CERTIFICATION_PRICE_BOB = 50;
export const CERTIFICATION_VALIDITY_MONTHS = 12;

export const certificationStateLabels: Record<CertificationDisplayState, string> = {
  not_eligible: 'No disponible',
  eligible: 'Disponible',
  pending: 'En revisión',
  active: 'Verificado',
  rejected: 'No aprobado',
  expired: 'Vencido',
};

export function normalizeCertificationState(row: CertificationStateRpcRow): CertificationState {
  return { ...row, price_bob: Number(row.price_bob) };
}

export function indexPublicCertifications(rows: PublicWorkerCertification[]) {
  return new Map(rows.map((row) => [row.worker_id, row]));
}

export function formatCertificationPrice(priceBob: number) {
  return `Bs ${new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(priceBob)}`;
}

export function formatCertificationDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

export function shouldShowVerifiedBadge(certification: Pick<PublicWorkerCertification, 'is_verified' | 'certification_expires_at'>) {
  if (!certification.is_verified || !certification.certification_expires_at) return false;
  const expiresAt = Date.parse(certification.certification_expires_at);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

