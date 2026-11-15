import type { WorkerApprovalStatus } from '@/modules/worker/types';
import { getWorkerCardCopy } from '@/modules/worker/validation';

export type HomeMode = 'hire' | 'work';

export type WorkerPanelTone = 'loading' | 'error' | 'neutral' | 'progress' | 'success' | 'attention';

export type WorkerPanel = {
  tone: WorkerPanelTone;
  title: string;
  description: string;
  /** `retry` reloads the status; `open` starts or resumes onboarding. */
  action: { kind: 'retry' | 'open'; label: string } | null;
};

export const HOME_FEATURED_LIMIT = 2;

export { getCategoryIcon } from '@/modules/marketplace/category-icons';

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const letters = [firstName, lastName]
    .map((part) => part?.trim().charAt(0) ?? '')
    .join('')
    .toUpperCase();
  return letters || 'C';
}

export function getGreeting(firstName?: string | null): string {
  const name = firstName?.trim();
  return name ? `Hola, ${name}` : 'Hola';
}

/** Splits a list into fixed-size rows, padding the last row with `null` cells. */
export function toGridRows<T>(items: T[], columns: number): (T | null)[][] {
  if (columns < 1) return [];
  const rows: (T | null)[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    const row: (T | null)[] = items.slice(index, index + columns);
    while (row.length < columns) row.push(null);
    rows.push(row);
  }
  return rows;
}

export function getWorkerPanel(input: {
  status: WorkerApprovalStatus | null;
  loading: boolean;
  starting: boolean;
  loadError: string | null;
}): WorkerPanel {
  if (input.starting) {
    return { tone: 'loading', title: 'Preparando tu perfil…', description: 'Un momento, estamos abriendo tu perfil profesional.', action: null };
  }
  if (input.loading) {
    return { tone: 'loading', title: 'Cargando tu estado profesional…', description: 'Consultando tu perfil profesional.', action: null };
  }
  if (input.loadError) {
    return {
      tone: 'error',
      title: 'No pudimos cargar tu perfil profesional',
      description: input.loadError,
      action: { kind: 'retry', label: 'Reintentar' },
    };
  }

  const copy = getWorkerCardCopy(input.status);
  switch (input.status) {
    case 'draft':
      return { tone: 'progress', ...copy, action: { kind: 'open', label: 'Continuar' } };
    case 'pending_approval':
      return { tone: 'progress', title: 'Perfil profesional en revisión', description: 'Será visible para clientes cuando un administrador lo apruebe.', action: { kind: 'open', label: 'Ver estado' } };
    case 'approved':
      return { tone: 'success', ...copy, action: { kind: 'open', label: 'Ver mi perfil profesional' } };
    case 'rejected':
      return { tone: 'attention', ...copy, action: { kind: 'open', label: 'Corregir perfil' } };
    case 'suspended':
      return { tone: 'attention', ...copy, action: { kind: 'open', label: 'Ver estado' } };
    default:
      return { tone: 'neutral', ...copy, action: { kind: 'open', label: 'Crear perfil profesional' } };
  }
}

export function buildExploreSearchParams(query: string): { q: string } | null {
  const clean = query.trim();
  return clean ? { q: clean } : null;
}
