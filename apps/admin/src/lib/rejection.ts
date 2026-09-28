export function validateRejectionReason(value: unknown) {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (reason.length < 10 || reason.length > 500) {
    return { ok: false as const, error: 'El motivo debe tener entre 10 y 500 caracteres.' };
  }
  return { ok: true as const, value: reason };
}
