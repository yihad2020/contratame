import type { ReportContext, ReportCursor, ReportReason, ReportStatus, UserReport } from '@/modules/report/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const reportReasons: Record<ReportReason, string> = {
  misleading_profile: 'Perfil engañoso',
  inappropriate_behavior: 'Comportamiento inapropiado',
  harassment: 'Acoso',
  fraud_or_scam: 'Fraude o estafa',
  unsafe_behavior: 'Conducta insegura',
  service_issue: 'Problema con el servicio',
  other: 'Otro motivo',
};
export const reportStatuses: Record<ReportStatus, string> = {
  open: 'Abierto', under_review: 'En revisión', resolved: 'Resuelto', dismissed: 'Desestimado',
};
const allReasons = Object.keys(reportReasons) as ReportReason[];
const profileReasons: ReportReason[] = ['misleading_profile', 'inappropriate_behavior', 'other'];
const statuses = Object.keys(reportStatuses) as ReportStatus[];

export function normalizeReportText(value: string) {
  return value.trim().replace(/\s+/gu, ' ');
}

export function reportTextLength(value: string) {
  return Array.from(normalizeReportText(value)).length;
}

export function allowedReportReasons(context: ReportContext) {
  return context === 'profile' ? profileReasons : allReasons;
}

export function validateReportInput(context: ReportContext, reason: string, description: string) {
  if (!allowedReportReasons(context).includes(reason as ReportReason)) {
    return { ok: false as const, error: 'Selecciona un motivo válido.' };
  }
  const normalized = normalizeReportText(description);
  const length = Array.from(normalized).length;
  if (length < 20) return { ok: false as const, error: 'Describe lo ocurrido con al menos 20 caracteres.' };
  if (length > 2000) return { ok: false as const, error: 'La descripción no puede superar 2.000 caracteres.' };
  return { ok: true as const, reason: reason as ReportReason, description: normalized };
}

export function normalizeReportId(value: string | string[] | undefined) {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase();
  return UUID_PATTERN.test(clean) ? clean : null;
}

export function normalizeUserReport(value: unknown): UserReport | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.report_id !== 'string' || !UUID_PATTERN.test(row.report_id)
    || (row.context_type !== 'profile' && row.context_type !== 'booking')
    || !allReasons.includes(row.reason as ReportReason)
    || !statuses.includes(row.status as ReportStatus)
    || typeof row.description !== 'string'
    || typeof row.created_at !== 'string'
    || typeof row.reported_context_available !== 'boolean') return null;
  return {
    report_id: row.report_id,
    context_type: row.context_type,
    reported_display_name: typeof row.reported_display_name === 'string' ? row.reported_display_name : null,
    reported_context_available: row.reported_context_available,
    booking_id: typeof row.booking_id === 'string' && UUID_PATTERN.test(row.booking_id) ? row.booking_id : null,
    reason: row.reason as ReportReason,
    description: row.description,
    status: row.status as ReportStatus,
    created_at: row.created_at,
    reviewed_at: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
  };
}

export function mergeReportPages(current: UserReport[], incoming: UserReport[]) {
  const byId = new Map(current.map((item) => [item.report_id, item]));
  incoming.forEach((item) => byId.set(item.report_id, item));
  return Array.from(byId.values()).sort((left, right) => right.created_at.localeCompare(left.created_at) || right.report_id.localeCompare(left.report_id));
}

export function oldestReportCursor(items: UserReport[]): ReportCursor | null {
  const oldest = items[items.length - 1];
  return oldest ? { createdAt: oldest.created_at, reportId: oldest.report_id } : null;
}

