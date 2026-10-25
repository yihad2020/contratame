export function reportFailureMessage(cause: unknown) {
  const detail = cause && typeof cause === 'object' ? cause as { code?: unknown; message?: unknown } : null;
  const code = typeof detail?.code === 'string' ? detail.code : null;
  const message = typeof detail?.message === 'string' ? detail.message : '';
  if (__DEV__) console.warn('[MOD-12] reports', { code, message });
  if (/failed to fetch|network request failed|networkerror|timeout/i.test(message)) return 'No pudimos conectar. Revisa tu conexión e inténtalo nuevamente.';
  if (code === '23505' || /duplicate report/i.test(message)) return 'Ya enviaste un reporte con este motivo para este contexto.';
  if (code === 'P0002') return 'El contexto del reporte ya no está disponible.';
  if (code === '42501') return 'Tu cuenta no puede realizar esta operación.';
  if (code === '22023') return 'Revisa el motivo y la descripción del reporte.';
  return 'No pudimos completar la operación. Inténtalo nuevamente.';
}

