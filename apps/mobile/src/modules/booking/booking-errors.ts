export function bookingFailureMessage(cause: unknown) {
  const detail = cause && typeof cause === 'object' ? cause as { code?: unknown; message?: unknown } : null;
  const code = typeof detail?.code === 'string' ? detail.code : null;
  const message = typeof detail?.message === 'string' ? detail.message : '';
  if (__DEV__) console.warn('[MOD-08] booking', { code, message });

  if (code === '42501') return 'No tienes permiso para consultar o cambiar este trabajo.';
  if (code === '55000' && /stale|not scheduled|not in progress|not pending completion/i.test(message)) {
    return 'El estado del trabajo ya cambió. Actualiza el detalle antes de continuar.';
  }
  if (code === '55000') return 'El trabajo ya no admite esta acción.';
  if (code === '22023') return 'El trabajo o la paginación solicitada no son válidos.';
  if (/failed to fetch|network request failed|networkerror/i.test(message)) {
    return 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.';
  }
  return 'No pudimos completar la operación con el trabajo. Inténtalo nuevamente.';
}
