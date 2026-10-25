import { favoriteFailureMessage } from '@/modules/favorite/favorite-errors';
import {
  mergeFavoritePages,
  normalizeFavorite,
  oldestFavoriteCursor,
  removeFavoriteLocally,
} from '@/modules/favorite/favorite-model';
import type { FavoriteListItem } from '@/modules/favorite/types';

const workerId = 'c1000000-0000-4000-8000-000000000001';

function favorite(overrides: Partial<FavoriteListItem> = {}): FavoriteListItem {
  return {
    worker_id: workerId,
    favorite_created_at: '2026-10-04T16:00:00Z',
    available: true,
    display_name: 'Ana P.',
    professional_bio: 'Servicio profesional.',
    years_experience: 5,
    public_area_label: 'Equipetrol',
    city: 'Santa Cruz de la Sierra',
    department: 'Santa Cruz',
    service_title: 'Instalación eléctrica',
    category_name: 'Electricidad',
    ...overrides,
  };
}

describe('MOD-12 favorite model', () => {
  test('normalizes an eligible public-safe favorite', () => {
    expect(normalizeFavorite(favorite())).toEqual(favorite());
  });

  test('rejects malformed identifiers and incomplete eligible rows', () => {
    expect(normalizeFavorite({ ...favorite(), worker_id: 'invalid' })).toBeNull();
    expect(normalizeFavorite({ ...favorite(), display_name: null })).toBeNull();
    expect(normalizeFavorite(null)).toBeNull();
  });

  test('strips every public field when the worker is unavailable', () => {
    expect(normalizeFavorite({ ...favorite(), available: false })).toEqual({
      ...favorite(),
      available: false,
      display_name: null,
      professional_bio: null,
      years_experience: null,
      public_area_label: null,
      city: null,
      department: null,
      service_title: null,
      category_name: null,
    });
  });

  test('deduplicates pages and orders newest first with a deterministic tie-breaker', () => {
    const secondId = 'c1000000-0000-4000-8000-000000000002';
    const newer = favorite({ worker_id: secondId, favorite_created_at: '2026-10-04T17:00:00Z' });
    const updated = favorite({ service_title: 'Servicio actualizado' });
    expect(mergeFavoritePages([favorite(), newer], [updated, newer])).toEqual([newer, updated]);
  });

  test('derives the oldest composite cursor', () => {
    const older = favorite({ favorite_created_at: '2026-10-04T15:00:00Z' });
    expect(oldestFavoriteCursor([favorite(), older])).toEqual({
      createdAt: older.favorite_created_at,
      workerId: older.worker_id,
    });
    expect(oldestFavoriteCursor([])).toBeNull();
  });

  test('removes only the selected worker from local state', () => {
    const second = favorite({ worker_id: 'c1000000-0000-4000-8000-000000000002' });
    expect(removeFavoriteLocally([favorite(), second], workerId)).toEqual([second]);
  });

  test('maps network, unavailable, authorization and unknown failures safely', () => {
    expect(favoriteFailureMessage({ message: 'Network request failed' })).toContain('conexión');
    expect(favoriteFailureMessage({ code: 'P0002', message: 'public worker not available' })).toContain('no está disponible');
    expect(favoriteFailureMessage({ code: '42501', message: 'internal' })).toContain('cuenta');
    expect(favoriteFailureMessage({ code: 'XX000', message: 'secret SQL detail' })).not.toContain('secret');
  });
});
