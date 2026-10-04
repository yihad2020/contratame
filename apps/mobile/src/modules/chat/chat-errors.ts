export function chatFailureMessage(cause: unknown) {
  const detail = cause && typeof cause === 'object' ? cause as { code?: unknown; message?: unknown } : null;
  const code = typeof detail?.code === 'string' ? detail.code : null;
  const message = typeof detail?.message === 'string' ? detail.message : '';
  if (__DEV__) console.warn('[MOD-10] chat', { code, message });

  if (/failed to fetch|network request failed|networkerror|timeout/i.test(message)) {
    return 'No pudimos conectar con el chat. Revisa tu conexión e inténtalo nuevamente.';
  }
  if (code === '42501') return 'No tienes permiso para acceder a esta conversación.';
  if (code === '55000' && /closed/i.test(message)) return 'La conversación está cerrada y ya no acepta mensajes.';
  if (code === '22023' && /between 1 and 2000/i.test(message)) {
    return 'El mensaje debe tener entre 1 y 2.000 caracteres.';
  }
  if (code === '23505') return 'No pudimos confirmar este envío. Sincroniza el chat antes de reintentar.';
  return 'No pudimos completar la operación del chat. Inténtalo nuevamente.';
}

