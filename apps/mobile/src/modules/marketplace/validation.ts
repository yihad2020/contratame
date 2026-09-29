import type {
  MarketplaceFilterDraft,
  MarketplaceFilters,
  MarketplaceResult,
} from '@/modules/marketplace/types';
import type { PricingType } from '@/modules/worker/types';

export type MarketplaceValidationResult =
  | { ok: true; value: MarketplaceFilters }
  | { ok: false; errors: Record<string, string> };

const PRICED_TYPES: PricingType[] = ['hourly', 'daily', 'fixed'];

export const emptyMarketplaceDraft: MarketplaceFilterDraft = {
  query: '',
  categoryId: '',
  city: '',
  department: '',
  location: null,
  radiusKm: '',
  pricingType: '',
  minPriceText: '',
  maxPriceText: '',
  minYearsText: '',
  availabilityDay: '',
  sort: 'default',
};

export function withoutMarketplaceDraftLocation(
  draft: MarketplaceFilterDraft,
): MarketplaceFilterDraft {
  return {
    ...draft,
    location: null,
    radiusKm: '',
    sort: draft.sort === 'distance' ? 'default' : draft.sort,
  };
}

export function withoutMarketplaceAppliedLocation(
  filters: MarketplaceFilters,
): MarketplaceFilters {
  return {
    ...filters,
    location: null,
    radiusM: null,
    sort: filters.sort === 'distance' ? 'default' : filters.sort,
  };
}

function optionalNumber(value: string, field: string, errors: Record<string, string>) {
  const clean = value.trim().replace(',', '.');
  if (!clean) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(clean)) {
    errors[field] = 'Usa un número positivo con hasta dos decimales.';
    return null;
  }
  return Number(clean);
}

export function validateMarketplaceFilters(draft: MarketplaceFilterDraft): MarketplaceValidationResult {
  const errors: Record<string, string> = {};
  const query = draft.query.trim();
  const city = draft.city.trim();
  const department = draft.department.trim();
  if (Array.from(query).length > 100) errors.query = 'La búsqueda no puede superar 100 caracteres.';
  if (Array.from(city).length > 100) errors.city = 'La ciudad no puede superar 100 caracteres.';
  if (Array.from(department).length > 100) errors.department = 'El departamento no puede superar 100 caracteres.';

  const minPriceBob = optionalNumber(draft.minPriceText, 'minPrice', errors);
  const maxPriceBob = optionalNumber(draft.maxPriceText, 'maxPrice', errors);
  if (minPriceBob !== null && maxPriceBob !== null && minPriceBob > maxPriceBob) {
    errors.maxPrice = 'El precio máximo debe ser igual o mayor al mínimo.';
  }

  let minYearsExperience: number | null = null;
  if (draft.minYearsText.trim()) {
    if (!/^\d+$/.test(draft.minYearsText.trim())) errors.experience = 'Usa años enteros entre 0 y 60.';
    else {
      minYearsExperience = Number(draft.minYearsText.trim());
      if (minYearsExperience < 0 || minYearsExperience > 60) errors.experience = 'La experiencia debe estar entre 0 y 60 años.';
    }
  }

  let availabilityDay: number | null = null;
  if (draft.availabilityDay !== '') {
    availabilityDay = Number(draft.availabilityDay);
    if (!Number.isInteger(availabilityDay) || availabilityDay < 0 || availabilityDay > 6) {
      errors.availability = 'Selecciona un día válido.';
    }
  }

  let radiusM: number | null = null;
  if (draft.radiusKm.trim()) {
    if (!draft.location) errors.radius = 'Activa tu ubicación antes de limitar la distancia.';
    else if (!/^\d+$/.test(draft.radiusKm.trim())) errors.radius = 'Usa kilómetros enteros entre 1 y 50.';
    else {
      const radiusKm = Number(draft.radiusKm.trim());
      if (radiusKm < 1 || radiusKm > 50) errors.radius = 'El radio debe estar entre 1 y 50 km.';
      else radiusM = radiusKm * 1000;
    }
  }

  if (draft.sort === 'distance' && !draft.location) errors.sort = 'Activa tu ubicación para ordenar por distancia.';
  if (draft.sort === 'price_asc' && !PRICED_TYPES.includes(draft.pricingType as PricingType)) {
    errors.sort = 'Selecciona hora, día o precio fijo para ordenar por precio.';
  }

  return Object.keys(errors).length
    ? { ok: false, errors }
    : {
      ok: true,
      value: {
        query: query || null,
        categoryId: draft.categoryId || null,
        city: city || null,
        department: department || null,
        location: draft.location,
        radiusM,
        pricingType: draft.pricingType || null,
        minPriceBob,
        maxPriceBob,
        minYearsExperience,
        availabilityDay,
        sort: draft.sort,
      },
    };
}

export function formatMarketplacePrice(type: PricingType, priceBob: number | null) {
  if (type === 'quote') return 'Precio según cotización';
  const amount = priceBob === null ? '—' : new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(priceBob);
  if (type === 'hourly') return `Bs ${amount} / hora`;
  if (type === 'daily') return `Bs ${amount} / día`;
  return `Bs ${amount} precio fijo`;
}

export function formatMarketplaceDistance(distanceM: number | null) {
  if (distanceM === null) return null;
  if (distanceM < 1000) return `${Math.max(1, Math.round(distanceM))} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

export function mergeMarketplaceResults(current: MarketplaceResult[], incoming: MarketplaceResult[]) {
  const byWorker = new Map(current.map((result) => [result.worker_id, result]));
  incoming.forEach((result) => byWorker.set(result.worker_id, result));
  return Array.from(byWorker.values());
}

export function buildMarketplaceRpcParams(filters: MarketplaceFilters, offset: number, limit: number) {
  return {
    p_query: filters.query,
    p_category_id: filters.categoryId,
    p_city: filters.city,
    p_department: filters.department,
    p_latitude: filters.location?.latitude ?? null,
    p_longitude: filters.location?.longitude ?? null,
    p_radius_m: filters.radiusM,
    p_pricing_type: filters.pricingType,
    p_min_price_bob: filters.minPriceBob,
    p_max_price_bob: filters.maxPriceBob,
    p_min_years_experience: filters.minYearsExperience,
    p_availability_day: filters.availabilityDay,
    p_sort: filters.sort,
    p_offset: offset,
    p_limit: limit,
  };
}
