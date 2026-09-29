export function marketplaceFailureMessage(cause: unknown, fallback: string, operation: string) {
  const detail = cause && typeof cause === 'object' ? cause as { code?: unknown; message?: unknown } : null;
  const code = typeof detail?.code === 'string' ? detail.code : null;
  const message = typeof detail?.message === 'string' ? detail.message : '';
  if (__DEV__) console.warn(`[MOD-04] ${operation}`, { code, message });

  if (code === '42501') return 'Tu cuenta no puede usar esta búsqueda. Vuelve a iniciar sesión si el problema continúa.';
  if (code === '22023') return 'Revisa los filtros seleccionados e inténtalo nuevamente.';
  if (/failed to fetch|network request failed|networkerror/i.test(message)) {
    return 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.';
  }
  return fallback;
}
