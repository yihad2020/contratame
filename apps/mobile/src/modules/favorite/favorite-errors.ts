export function favoriteFailureMessage(cause: unknown) {
  const detail = cause && typeof cause === 'object'
    ? cause as { code?: unknown; message?: unknown }
    : null;
  const code = typeof detail?.code === 'string' ? detail.code : null;
  const message = typeof detail?.message === 'string' ? detail.message : '';
  if (__DEV__) console.warn('[MOD-12] favorites', { code, message });

  if (/failed to fetch|network request failed|networkerror|timeout/i.test(message)) {
    return 'No pudimos conectar con tus favoritos. Revisa tu conexión e inténtalo nuevamente.';
  }
  if (code === 'P0002' && /public worker not available/i.test(message)) {
    return 'Este profesional ya no está disponible públicamente.';
  }
  if (code === '42501') return 'Tu cuenta no puede realizar esta operación.';
  if (code === '22023') return 'La solicitud de favoritos no es válida.';
  return 'No pudimos completar la operación de favoritos. Inténtalo nuevamente.';
}
