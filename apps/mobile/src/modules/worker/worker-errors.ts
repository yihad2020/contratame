export class WorkerUserError extends Error {}

export function workerFailureMessage(cause: unknown, fallback: string, operation: string): string {
  if (cause instanceof WorkerUserError) return cause.message;

  const detail = cause && typeof cause === 'object' ? cause as { code?: unknown; message?: unknown } : null;
  const code = typeof detail?.code === 'string' ? detail.code : null;
  const message = typeof detail?.message === 'string' ? detail.message : '';
  if (__DEV__) console.warn(`[MOD-02] ${operation}`, { code, message });

  if (code === '42501') return 'Tu cuenta no tiene permiso para realizar esta acción. Vuelve a iniciar sesión si el problema continúa.';
  if (code === '55000') return 'El perfil ya está en revisión o no admite cambios en su estado actual.';
  if (/failed to fetch|network request failed|networkerror/i.test(message)) {
    return 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.';
  }
  return fallback;
}
