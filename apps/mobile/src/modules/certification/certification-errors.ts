export function certificationFailureMessage(cause: unknown) {
  const detail = cause as { message?: unknown } | null;
  const message = cause instanceof Error
    ? cause.message
    : typeof detail?.message === 'string' ? detail.message : String(cause ?? '');
  if (/already pending|duplicate/i.test(message)) return 'Ya tienes una solicitud de certificación en revisión.';
  if (/already active/i.test(message)) return 'Tu certificación ya está activa.';
  if (/approved worker required|no longer eligible/i.test(message)) return 'Tu perfil profesional debe estar aprobado para solicitar la certificación.';
  if (/active confirmed account|required|permission/i.test(message)) return 'Tu cuenta no tiene acceso a esta operación.';
  return 'No pudimos procesar la certificación. Inténtalo nuevamente.';
}

