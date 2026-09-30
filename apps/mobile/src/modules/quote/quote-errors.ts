export function quoteFailureMessage(cause: unknown) {
  const detail = cause && typeof cause === 'object' ? cause as { code?: unknown; message?: unknown } : null;
  const code = typeof detail?.code === 'string' ? detail.code : null;
  const message = typeof detail?.message === 'string' ? detail.message : '';
  if (__DEV__) console.warn('[MOD-07] quote', { code, message });

  if (code === '42501') return 'No tienes permiso para realizar esta acción sobre la cotización.';
  if (code === '55000' && /not current and acceptable/i.test(message)) {
    return 'La cotización ya cambió o dejó de estar vigente. Actualiza el detalle.';
  }
  if (code === '55000' && /not quotable/i.test(message)) {
    return 'La solicitud ya no admite cotizaciones.';
  }
  if (code === '55000') return 'La solicitud o el profesional ya no están en un estado válido.';
  if (code === '22023' && /scheduled_at|schedule/i.test(message)) {
    return 'Revisa la fecha y hora definitivas de la contratación.';
  }
  if (code === '22023') return 'Revisa los datos de la cotización e inténtalo nuevamente.';
  if (code === '23505') return 'La solicitud ya fue actualizada. Recarga antes de continuar.';
  if (/failed to fetch|network request failed|networkerror/i.test(message)) {
    return 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.';
  }
  return 'No pudimos completar la operación con la cotización. Inténtalo nuevamente.';
}
