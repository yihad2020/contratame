export function reviewFailureMessage(cause: unknown) {
  const error = cause as { code?: string; message?: string } | null;
  if (error?.code === '42501') return 'No tienes permiso para crear o consultar esta reseña.';
  if (error?.code === '23505') return 'Este trabajo ya tiene una reseña.';
  if (error?.code === '55000') return 'El trabajo debe estar completado y sin una reseña previa.';
  if (error?.code === '22023' || error?.code === '23514') return 'La calificación no es válida.';
  if (error?.message?.toLowerCase().includes('network')) return 'No pudimos conectar. Revisa tu conexión e inténtalo nuevamente.';
  return 'No pudimos guardar la reseña. Inténtalo nuevamente.';
}
