export function publicWorkerFailureMessage(cause: unknown) {
  const detail = cause && typeof cause === 'object' ? cause as { code?: unknown; message?: unknown } : null;
  const code = typeof detail?.code === 'string' ? detail.code : null;
  const message = typeof detail?.message === 'string' ? detail.message : '';
  if (__DEV__) console.warn('[MOD-05] public worker profile', { code, message });

  if (code === '42501') return 'Tu cuenta no puede consultar este perfil. Vuelve a iniciar sesión si el problema continúa.';
  if (/failed to fetch|network request failed|networkerror/i.test(message)) {
    return 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.';
  }
  return 'No pudimos cargar este perfil profesional. Inténtalo nuevamente.';
}
