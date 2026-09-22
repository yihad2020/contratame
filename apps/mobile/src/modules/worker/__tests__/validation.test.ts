import type { WorkerDraft } from '@/modules/worker/types';
import {
  canSubmitWorkerDraft,
  getCompletionSections,
  getWorkerCardCopy,
  validateAvailabilityRange,
  validatePortfolioMetadata,
  validateProfessionalProfile,
  validateRadius,
  validateService,
} from '@/modules/worker/validation';

describe('MOD-02 worker validation', () => {
  test('accepts a 40-character Unicode professional bio and zero experience', () => {
    const result = validateProfessionalProfile('á'.repeat(40), '0');
    expect(result).toEqual({ ok: true, value: { bio: 'á'.repeat(40), yearsExperience: 0 } });
  });

  test.each([
    ['short bio', 'a'.repeat(39), '5'],
    ['long bio', 'a'.repeat(601), '5'],
    ['negative years', 'a'.repeat(40), '-1'],
    ['decimal years', 'a'.repeat(40), '2.5'],
    ['too many years', 'a'.repeat(40), '61'],
  ])('rejects %s', (_name, bio, years) => {
    expect(validateProfessionalProfile(bio, years).ok).toBe(false);
  });

  test('trims and accepts a quote service with a null price', () => {
    const result = validateService({
      categoryId: 'category', title: '  Instalación eléctrica  ', description: '  Trabajo seguro y ordenado en el domicilio.  ', pricingType: 'quote', priceText: '900',
    });
    expect(result).toEqual({
      ok: true,
      value: { categoryId: 'category', title: 'Instalación eléctrica', description: 'Trabajo seguro y ordenado en el domicilio.', pricingType: 'quote', priceBob: null },
    });
  });

  test.each(['', '0', '-1', '10.999', 'texto'])('rejects invalid priced service amount %s', (priceText) => {
    expect(validateService({ categoryId: 'c', title: 'Servicio válido', description: 'Descripción suficientemente larga.', pricingType: 'hourly', priceText }).ok).toBe(false);
  });

  test('accepts a positive BOB amount with two decimals', () => {
    const result = validateService({ categoryId: 'c', title: 'Servicio válido', description: 'Descripción suficientemente larga.', pricingType: 'fixed', priceText: '150,50' });
    expect(result.ok && result.value.priceBob).toBe(150.5);
  });

  test.each([['1', true], ['50', true], ['0', false], ['51', false], ['10.5', false]])('validates radius %s', (value, valid) => {
    expect(validateRadius(value).ok).toBe(valid);
  });

  test('accepts adjacent availability ranges', () => {
    const result = validateAvailabilityRange(1, '12:00', '13:00', [{ id: 'first', day_of_week: 1, start_time: '08:00', end_time: '12:00', active: true }]);
    expect(result.ok).toBe(true);
  });

  test('rejects overlap on the same weekday', () => {
    const result = validateAvailabilityRange(1, '11:30', '14:00', [{ id: 'first', day_of_week: 1, start_time: '08:00', end_time: '12:00', active: true }]);
    expect(result.ok).toBe(false);
  });

  test.each([['08:15', '12:00'], ['18:00', '08:00'], ['08:00', '08:00']])('rejects invalid or cross-midnight range %s-%s', (start, end) => {
    expect(validateAvailabilityRange(1, start, end, []).ok).toBe(false);
  });

  test('portfolio is valid at zero items and rejects item thirteen', () => {
    expect(validatePortfolioMetadata('Trabajo', '', 0).ok).toBe(true);
    expect(validatePortfolioMetadata('Trabajo', '', 12).ok).toBe(false);
  });

  test('maps every worker state to product-specific Home copy', () => {
    expect(getWorkerCardCopy(null).title).toBe('Quiero ofrecer mis servicios');
    expect(getWorkerCardCopy('draft').title).toBe('Continuar mi perfil profesional');
    expect(getWorkerCardCopy('pending_approval').description).toBe('En revisión');
    expect(getWorkerCardCopy('rejected').title).toBe('Corregir mi perfil');
    expect(getWorkerCardCopy('suspended').title).toContain('suspendido');
  });

  test('requires profile, active service, location and availability but not portfolio', () => {
    const draft = completeDraft();
    expect(canSubmitWorkerDraft(draft)).toBe(true);
    expect(getCompletionSections(draft).find((section) => section.key === 'portfolio')).toMatchObject({ complete: true, optional: true });
    expect(canSubmitWorkerDraft({ ...draft, services: [] })).toBe(false);
    expect(canSubmitWorkerDraft({ ...draft, location: null })).toBe(false);
    expect(canSubmitWorkerDraft({ ...draft, availability: [] })).toBe(false);
  });

  test('review does not claim completion for an inactive category or invalid service', () => {
    const draft = completeDraft();
    expect(canSubmitWorkerDraft({ ...draft, categories: [] })).toBe(false);
    expect(canSubmitWorkerDraft({ ...draft, services: [{ ...draft.services[0], description: 'short' }] })).toBe(false);
  });

  test('review requires a parseable private point and non-overlapping valid ranges', () => {
    const draft = completeDraft();
    expect(canSubmitWorkerDraft({ ...draft, location: { ...draft.location!, latitude: null } })).toBe(false);
    expect(canSubmitWorkerDraft({ ...draft, availability: [
      ...draft.availability,
      { ...draft.availability[0], id: 'overlap', start_time: '11:30', end_time: '13:00' },
    ] })).toBe(false);
    expect(canSubmitWorkerDraft({ ...draft, availability: [{ ...draft.availability[0], start_time: '08:15:00' }] })).toBe(false);
  });
});

function completeDraft(): WorkerDraft {
  return {
    worker: { id: 'worker', profile_id: 'profile', bio: 'a'.repeat(40), years_experience: 0, approval_status: 'draft', created_at: '', updated_at: '' },
    categories: [{ id: 'category', name: 'Electricidad', slug: 'electricidad', icon_key: null, active: true, sort_order: 1 }],
    services: [{ id: 'service', worker_id: 'worker', category_id: 'category', title: 'Instalación', description: 'Descripción suficientemente larga.', pricing_type: 'quote', price_bob: null, active: true, created_at: '', updated_at: '' }],
    location: { worker_id: 'worker', private_location: {}, public_location: null, public_area_label: 'Centro', city: 'Santa Cruz de la Sierra', department: 'Santa Cruz', country_code: 'BO', service_radius_m: 10000, updated_at: '', latitude: -17.78, longitude: -63.18 },
    availability: [{ id: 'range', worker_id: 'worker', day_of_week: 1, start_time: '08:00', end_time: '12:00', active: true, created_at: '', updated_at: '' }],
    portfolio: [],
  };
}
