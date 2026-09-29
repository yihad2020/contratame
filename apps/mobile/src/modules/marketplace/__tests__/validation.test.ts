import type { MarketplaceFilterDraft, MarketplaceResult } from '@/modules/marketplace/types';
import {
  buildMarketplaceRpcParams,
  emptyMarketplaceDraft,
  formatMarketplaceDistance,
  formatMarketplacePrice,
  mergeMarketplaceResults,
  validateMarketplaceFilters,
  withoutMarketplaceAppliedLocation,
  withoutMarketplaceDraftLocation,
} from '@/modules/marketplace/validation';

function draft(overrides: Partial<MarketplaceFilterDraft> = {}): MarketplaceFilterDraft {
  return { ...emptyMarketplaceDraft, ...overrides };
}

function result(workerId: string, totalCount = 2): MarketplaceResult {
  return {
    worker_id: workerId,
    display_name: 'Ana P.',
    professional_bio: 'Trabajo profesional seguro.',
    years_experience: 5,
    public_area_label: 'Equipetrol',
    city: 'Santa Cruz de la Sierra',
    department: 'Santa Cruz',
    service_radius_m: 10000,
    service_id: `${workerId.slice(0, -1)}2`,
    category_id: `${workerId.slice(0, -1)}3`,
    category_name: 'Electricidad',
    category_slug: 'electricidad',
    service_title: 'Instalación eléctrica',
    service_description: 'Instalación residencial.',
    pricing_type: 'hourly',
    price_bob: 80,
    distance_m: null,
    total_count: totalCount,
  };
}

describe('MOD-04 marketplace filters', () => {
  test('normalizes optional text and builds the RPC allowlist parameters', () => {
    const checked = validateMarketplaceFilters(draft({
      query: '  Electricidad  ',
      city: ' Santa Cruz de la Sierra ',
      department: ' Santa Cruz ',
      pricingType: 'hourly',
      minPriceText: '80,50',
      maxPriceText: '200',
      minYearsText: '3',
      availabilityDay: '1',
      location: { latitude: -17.78, longitude: -63.18 },
      radiusKm: '10',
      sort: 'distance',
    }));
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    expect(buildMarketplaceRpcParams(checked.value, 12, 12)).toEqual(expect.objectContaining({
      p_query: 'Electricidad', p_city: 'Santa Cruz de la Sierra', p_department: 'Santa Cruz',
      p_latitude: -17.78, p_longitude: -63.18, p_radius_m: 10000,
      p_min_price_bob: 80.5, p_max_price_bob: 200, p_min_years_experience: 3,
      p_availability_day: 1, p_sort: 'distance', p_offset: 12, p_limit: 12,
    }));
  });

  test('rejects invalid price, experience, availability and radius filters', () => {
    const checked = validateMarketplaceFilters(draft({
      minPriceText: '200', maxPriceText: '100', minYearsText: '61',
      availabilityDay: '8', radiusKm: '10',
    }));
    expect(checked.ok).toBe(false);
    if (checked.ok) return;
    expect(checked.errors).toEqual(expect.objectContaining({
      maxPrice: expect.any(String), experience: expect.any(String),
      availability: expect.any(String), radius: expect.any(String),
    }));
  });

  test('requires location for distance sort and a comparable type for price sort', () => {
    const distance = validateMarketplaceFilters(draft({ sort: 'distance' }));
    const price = validateMarketplaceFilters(draft({ sort: 'price_asc', pricingType: 'quote' }));
    expect(distance.ok).toBe(false);
    expect(price.ok).toBe(false);
  });

  test('keeps denied location equivalent to an ordinary marketplace search', () => {
    const locatedDraft = draft({
      location: { latitude: -17.78, longitude: -63.18 },
      radiusKm: '10',
      sort: 'distance',
    });
    const located = validateMarketplaceFilters(locatedDraft);
    expect(located.ok).toBe(true);
    if (!located.ok) return;

    const cleanDraft = withoutMarketplaceDraftLocation(locatedDraft);
    const cleanApplied = withoutMarketplaceAppliedLocation(located.value);
    const checked = validateMarketplaceFilters(cleanDraft);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    expect(checked.value.location).toBeNull();
    expect(checked.value.radiusM).toBeNull();
    expect(checked.value.sort).toBe('default');
    expect(cleanApplied.location).toBeNull();
    expect(cleanApplied.radiusM).toBeNull();
    expect(cleanApplied.sort).toBe('default');
  });
});

describe('MOD-04 marketplace presentation and pagination', () => {
  test.each([
    ['hourly', 80, 'Bs 80 / hora'],
    ['daily', 250, 'Bs 250 / día'],
    ['fixed', 120, 'Bs 120 precio fijo'],
    ['quote', null, 'Precio según cotización'],
  ] as const)('formats %s pricing truthfully', (type, price, expected) => {
    expect(formatMarketplacePrice(type, price)).toBe(expected);
  });

  test('formats safe distance without exposing coordinates', () => {
    expect(formatMarketplaceDistance(null)).toBeNull();
    expect(formatMarketplaceDistance(480)).toBe('480 m');
    expect(formatMarketplaceDistance(2400)).toBe('2.4 km');
  });

  test('merges pages without duplicate worker rows', () => {
    const a = result('41000000-0000-4000-8000-000000000001');
    const b = result('41000000-0000-4000-8000-000000000002');
    const refreshedA = { ...a, service_title: 'Servicio actualizado' };
    expect(mergeMarketplaceResults([a], [refreshedA, b])).toEqual([refreshedA, b]);
  });
});
