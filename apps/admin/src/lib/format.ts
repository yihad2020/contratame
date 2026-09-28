export const weekdayLabels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/La_Paz' }).format(new Date(value));
}

export function statusLabel(status: string) {
  if (status === 'pending') return 'Pendiente';
  if (status === 'approved') return 'Aprobada';
  if (status === 'rejected') return 'Rechazada';
  return status;
}

export function pricingLabel(value?: string) {
  return ({ hourly: 'Por hora', daily: 'Por día', fixed: 'Precio fijo', quote: 'Cotización' } as Record<string, string>)[value ?? ''] ?? 'Sin especificar';
}
