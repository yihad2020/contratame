export function notificationFailureMessage(cause: unknown) {
  const detail = cause && typeof cause === 'object'
    ? cause as { code?: unknown; message?: unknown }
    : null;
  const code = typeof detail?.code === 'string' ? detail.code : null;
  const message = typeof detail?.message === 'string' ? detail.message : '';
  if (__DEV__) console.warn('[MOD-11] notifications', { code, message });

  if (/failed to fetch|network request failed|networkerror|timeout/i.test(message)) {
    return 'No pudimos conectar con tus notificaciones. Revisa tu conexión e inténtalo nuevamente.';
  }
  if (code === '42501') return 'No tienes permiso para consultar o modificar esta notificación.';
  if (code === '22023') return 'La solicitud de notificaciones no es válida.';
  return 'No pudimos completar la operación de notificaciones. Inténtalo nuevamente.';
}
