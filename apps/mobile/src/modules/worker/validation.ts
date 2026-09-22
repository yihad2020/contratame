import type {
  CompletionSection,
  PricingType,
  WorkerAvailability,
  WorkerDraft,
} from '@/modules/worker/types';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

function characterCount(value: string) {
  return Array.from(value).length;
}

export function validateProfessionalProfile(bio: string, yearsText: string): ValidationResult<{ bio: string; yearsExperience: number }> {
  const cleanBio = bio.trim();
  const cleanYears = yearsText.trim();
  const errors: Record<string, string> = {};
  const bioLength = characterCount(cleanBio);
  if (bioLength < 40 || bioLength > 600) errors.bio = 'Escribe entre 40 y 600 caracteres.';
  if (!/^\d+$/.test(cleanYears)) errors.years = 'Ingresa un número entero entre 0 y 60.';
  const yearsExperience = Number(cleanYears);
  if (!errors.years && (!Number.isInteger(yearsExperience) || yearsExperience < 0 || yearsExperience > 60)) {
    errors.years = 'La experiencia debe estar entre 0 y 60 años.';
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { bio: cleanBio, yearsExperience } };
}

export type ServiceInput = {
  categoryId: string;
  title: string;
  description: string;
  pricingType: PricingType;
  priceText: string;
};

export function validateService(input: ServiceInput): ValidationResult<{
  categoryId: string;
  title: string;
  description: string;
  pricingType: PricingType;
  priceBob: number | null;
}> {
  const title = input.title.trim();
  const description = input.description.trim();
  const priceText = input.priceText.trim().replace(',', '.');
  const errors: Record<string, string> = {};
  if (!input.categoryId) errors.category = 'Selecciona una categoría.';
  if (characterCount(title) < 5 || characterCount(title) > 80) errors.title = 'Escribe entre 5 y 80 caracteres.';
  if (characterCount(description) < 20 || characterCount(description) > 500) errors.description = 'Escribe entre 20 y 500 caracteres.';
  let priceBob: number | null = null;
  if (input.pricingType !== 'quote') {
    if (!/^\d+(\.\d{1,2})?$/.test(priceText) || Number(priceText) <= 0) {
      errors.price = 'Ingresa un monto BOB positivo con hasta 2 decimales.';
    } else {
      priceBob = Number(priceText);
    }
  }
  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, value: { categoryId: input.categoryId, title, description, pricingType: input.pricingType, priceBob } };
}

export function validateRadius(radiusText: string): ValidationResult<{ radiusKm: number; radiusM: number }> {
  const value = radiusText.trim();
  if (!/^\d+$/.test(value)) return { ok: false, errors: { radius: 'Usa kilómetros enteros entre 1 y 50.' } };
  const radiusKm = Number(value);
  if (radiusKm < 1 || radiusKm > 50) return { ok: false, errors: { radius: 'El radio debe estar entre 1 y 50 km.' } };
  return { ok: true, value: { radiusKm, radiusM: radiusKm * 1000 } };
}

const TIME_PATTERN = /^([01]\d|2[0-3]):(00|30)$/;

export function validateAvailabilityRange(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  existing: Pick<WorkerAvailability, 'id' | 'day_of_week' | 'start_time' | 'end_time' | 'active'>[],
  editingId?: string,
): ValidationResult<{ dayOfWeek: number; startTime: string; endTime: string }> {
  const errors: Record<string, string> = {};
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) errors.day = 'Selecciona un día válido.';
  if (!TIME_PATTERN.test(startTime)) errors.start = 'Usa un horario en intervalos de 30 minutos.';
  if (!TIME_PATTERN.test(endTime)) errors.end = 'Usa un horario en intervalos de 30 minutos.';
  if (!errors.start && !errors.end) {
    const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    if (start >= end) errors.end = 'La hora final debe ser posterior a la inicial y no puede cruzar medianoche.';
    const overlaps = existing.some((range) => range.active && range.id !== editingId && range.day_of_week === dayOfWeek
      && start < toMinutes(range.end_time.slice(0, 5)) && end > toMinutes(range.start_time.slice(0, 5)));
    if (!errors.end && overlaps) errors.end = 'Este horario se superpone con otro rango del mismo día.';
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { dayOfWeek, startTime, endTime } };
}

export function validatePortfolioMetadata(titleValue: string, descriptionValue: string, currentCount: number) {
  const title = titleValue.trim();
  const description = descriptionValue.trim();
  const errors: Record<string, string> = {};
  if (characterCount(title) < 3 || characterCount(title) > 80) errors.title = 'Escribe entre 3 y 80 caracteres.';
  if (characterCount(description) > 300) errors.description = 'La descripción no puede superar 300 caracteres.';
  if (currentCount >= 12) errors.count = 'El portafolio admite hasta 12 trabajos.';
  return Object.keys(errors).length ? { ok: false as const, errors } : { ok: true as const, value: { title, description: description || null } };
}

export function getCompletionSections(draft: WorkerDraft): CompletionSection[] {
  const professional = validateProfessionalProfile(draft.worker.bio ?? '', draft.worker.years_experience?.toString() ?? '');
  const activeServices = draft.services.filter((service) => service.active);
  const validServices = activeServices.length > 0 && activeServices.every((service) =>
    draft.categories.some((category) => category.id === service.category_id && category.active)
    && validateService({
      categoryId: service.category_id,
      title: service.title,
      description: service.description ?? '',
      pricingType: service.pricing_type,
      priceText: service.price_bob?.toString() ?? '',
    }).ok
    && (service.pricing_type !== 'quote' || service.price_bob === null));
  const validLocation = draft.location !== null
    && draft.location.latitude !== null && Number.isFinite(draft.location.latitude)
    && draft.location.latitude >= -90 && draft.location.latitude <= 90
    && draft.location.longitude !== null && Number.isFinite(draft.location.longitude)
    && draft.location.longitude >= -180 && draft.location.longitude <= 180
    && draft.location.public_area_label.trim().length > 0
    && draft.location.city.trim().length > 0
    && draft.location.department.trim().length > 0
    && draft.location.country_code === 'BO'
    && draft.location.service_radius_m >= 1000
    && draft.location.service_radius_m <= 50000
    && draft.location.service_radius_m % 1000 === 0;
  const activeAvailability = draft.availability.filter((range) => range.active);
  const validAvailability = activeAvailability.length > 0 && activeAvailability.every((range) =>
    validateAvailabilityRange(range.day_of_week, range.start_time.slice(0, 5), range.end_time.slice(0, 5), activeAvailability, range.id).ok
    && /^\d{2}:(00|30)(?::00(?:\.0+)?)?$/.test(range.start_time)
    && /^\d{2}:(00|30)(?::00(?:\.0+)?)?$/.test(range.end_time));
  return [
    { key: 'profile', title: 'Perfil profesional', step: 1, complete: professional.ok, detail: professional.ok ? 'Biografía y experiencia completas.' : 'Completa una biografía de 40–600 caracteres y tus años de experiencia.' },
    { key: 'services', title: 'Servicios y precios', step: 2, complete: validServices, detail: validServices ? `${activeServices.length} servicio${activeServices.length === 1 ? '' : 's'} activo${activeServices.length === 1 ? '' : 's'}.` : 'Agrega o corrige un servicio activo con categoría vigente, descripción y precio o cotización.' },
    { key: 'location', title: 'Zona de trabajo', step: 3, complete: validLocation, detail: validLocation ? `${draft.location?.public_area_label}, radio de ${(draft.location?.service_radius_m ?? 0) / 1000} km.` : 'Selecciona una base, completa la zona y define un radio entre 1 y 50 km.' },
    { key: 'availability', title: 'Disponibilidad', step: 4, complete: validAvailability, detail: validAvailability ? `${activeAvailability.length} rango${activeAvailability.length === 1 ? '' : 's'} semanal${activeAvailability.length === 1 ? '' : 'es'}.` : 'Agrega o corrige un rango semanal válido, sin superposiciones.' },
    { key: 'portfolio', title: 'Portafolio', step: 5, complete: true, optional: true, detail: draft.portfolio.length ? `${draft.portfolio.length} trabajo${draft.portfolio.length === 1 ? '' : 's'} agregado${draft.portfolio.length === 1 ? '' : 's'}.` : 'Opcional: puedes enviarlo sin trabajos.' },
  ];
}

export function canSubmitWorkerDraft(draft: WorkerDraft) {
  return getCompletionSections(draft).filter((section) => !section.optional).every((section) => section.complete);
}

export function getWorkerCardCopy(status: WorkerDraft['worker']['approval_status'] | null) {
  switch (status) {
    case 'draft': return { title: 'Continuar mi perfil profesional', description: 'Retoma tu información y prepárala para revisión.' };
    case 'pending_approval': return { title: 'Perfil profesional', description: 'En revisión' };
    case 'approved': return { title: 'Mi perfil profesional', description: 'Tu perfil profesional está aprobado.' };
    case 'rejected': return { title: 'Corregir mi perfil', description: 'Revisa tu información y vuelve a enviarla.' };
    case 'suspended': return { title: 'Perfil profesional suspendido', description: 'Tu perfil no está visible y no puede editarse.' };
    default: return { title: 'Quiero ofrecer mis servicios', description: 'Crea tu perfil profesional.' };
  }
}
