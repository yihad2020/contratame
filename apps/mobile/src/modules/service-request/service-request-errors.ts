export function serviceRequestFailureMessage(cause: unknown) {
  const detail = cause && typeof cause === 'object' ? cause as { code?: unknown; message?: unknown } : null;
  const code = typeof detail?.code === 'string' ? detail.code : null;
  const message = typeof detail?.message === 'string' ? detail.message : '';
  if (__DEV__) console.warn('[MOD-06] service request', { code, message });

  if (code === '42501') return 'Tu cuenta no puede realizar esta operación. Vuelve a iniciar sesión si el problema continúa.';
  if (code === '22023' && /worker or service is not eligible/i.test(message)) {
    return 'Este profesional o servicio ya no está disponible. Vuelve a su perfil y elige una opción vigente.';
  }
  if (code === '22023') return 'Revisa los datos de la solicitud e inténtalo nuevamente.';
  if (/failed to fetch|network request failed|networkerror/i.test(message)) {
    return 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.';
  }
  return 'No pudimos completar la operación con la solicitud. Inténtalo nuevamente.';
}

