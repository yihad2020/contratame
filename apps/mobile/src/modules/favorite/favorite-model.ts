import type { FavoriteCursor, FavoriteListItem } from '@/modules/favorite/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function optionalString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function optionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function normalizeFavorite(value: unknown): FavoriteListItem | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.worker_id !== 'string'
      || !UUID_PATTERN.test(row.worker_id)
      || typeof row.favorite_created_at !== 'string'
      || typeof row.available !== 'boolean') return null;

  const item: FavoriteListItem = {
    worker_id: row.worker_id,
    favorite_created_at: row.favorite_created_at,
    available: row.available,
    display_name: optionalString(row.display_name),
    professional_bio: optionalString(row.professional_bio),
    years_experience: optionalNumber(row.years_experience),
    public_area_label: optionalString(row.public_area_label),
    city: optionalString(row.city),
    department: optionalString(row.department),
    service_title: optionalString(row.service_title),
    category_name: optionalString(row.category_name),
  };

  if (item.available && (!item.display_name || !item.public_area_label || !item.city)) return null;
  if (!item.available) {
    return {
      ...item,
      display_name: null,
      professional_bio: null,
      years_experience: null,
      public_area_label: null,
      city: null,
      department: null,
      service_title: null,
      category_name: null,
    };
  }
  return item;
}

export function mergeFavoritePages(current: FavoriteListItem[], incoming: FavoriteListItem[]) {
  const byWorker = new Map(current.map((item) => [item.worker_id, item]));
  incoming.forEach((item) => byWorker.set(item.worker_id, item));
  return Array.from(byWorker.values()).sort((left, right) =>
    right.favorite_created_at.localeCompare(left.favorite_created_at)
      || right.worker_id.localeCompare(left.worker_id));
}

export function oldestFavoriteCursor(items: FavoriteListItem[]): FavoriteCursor | null {
  const oldest = items[items.length - 1];
  return oldest ? { createdAt: oldest.favorite_created_at, workerId: oldest.worker_id } : null;
}

export function removeFavoriteLocally(items: FavoriteListItem[], workerId: string) {
  return items.filter((item) => item.worker_id !== workerId);
}
