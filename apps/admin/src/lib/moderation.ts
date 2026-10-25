import type { ReportStatus } from '@/lib/report-types';

export const reportStatusLabels: Record<ReportStatus, string> = {
  open: 'Abierto', under_review: 'En revisión', resolved: 'Resuelto', dismissed: 'Desestimado',
};

export const reportReasonLabels = {
  misleading_profile: 'Perfil engañoso', inappropriate_behavior: 'Comportamiento inapropiado', harassment: 'Acoso',
  fraud_or_scam: 'Fraude o estafa', unsafe_behavior: 'Conducta insegura', service_issue: 'Problema con el servicio', other: 'Otro motivo',
} as const;

export function normalizeModerationNotes(value: FormDataEntryValue | null) {
  return String(value ?? '').trim().replace(/\s+/gu, ' ');
}

export function validateModerationNotes(value: FormDataEntryValue | null) {
  const notes = normalizeModerationNotes(value);
  const length = Array.from(notes).length;
  if (length < 10) return { ok: false as const, error: 'Escribe al menos 10 caracteres.' };
  if (length > 1000) return { ok: false as const, error: 'Las notas no pueden superar 1.000 caracteres.' };
  return { ok: true as const, value: notes };
}

export function canModerateReport(current: ReportStatus, next: ReportStatus) {
  return (current === 'open' && ['under_review', 'resolved', 'dismissed'].includes(next))
    || (current === 'under_review' && ['resolved', 'dismissed'].includes(next));
}

