import { supabase } from '@/lib/supabase';
import { normalizeFavorite } from '@/modules/favorite/favorite-model';
import type { FavoriteCursor, FavoriteListItem, FavoriteMutation } from '@/modules/favorite/types';

export const FAVORITE_PAGE_SIZE = 20;

export async function getWorkerFavoriteState(workerId: string) {
  const { data, error } = await supabase.rpc('get_my_worker_favorite_state', {
    p_worker_id: workerId,
  });
  if (error) throw error;
  return data === true;
}

export async function addWorkerFavorite(workerId: string): Promise<FavoriteMutation> {
  const { data, error } = await supabase
    .rpc('add_worker_favorite', { p_worker_id: workerId })
    .single();
  if (error) throw error;
  const row = data as { worker_id?: unknown; is_favorite?: unknown; created_at?: unknown } | null;
  if (!row
      || typeof row.worker_id !== 'string'
      || row.is_favorite !== true
      || typeof row.created_at !== 'string') {
    throw new Error('invalid favorite creation response');
  }
  return { workerId: row.worker_id, isFavorite: true, createdAt: row.created_at };
}

export async function removeWorkerFavorite(workerId: string): Promise<FavoriteMutation> {
  const { data, error } = await supabase.rpc('remove_worker_favorite', {
    p_worker_id: workerId,
  });
  if (error) throw error;
  if (data !== false) throw new Error('invalid favorite removal response');
  return { workerId, isFavorite: false, createdAt: null };
}

export async function listMyWorkerFavorites(
  cursor: FavoriteCursor | null,
  limit = FAVORITE_PAGE_SIZE,
): Promise<FavoriteListItem[]> {
  const { data, error } = await supabase.rpc('list_my_worker_favorites', {
    p_before_created_at: cursor?.createdAt ?? null,
    p_before_worker_id: cursor?.workerId ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return ((data ?? []) as unknown[]).flatMap((row) => {
    const favorite = normalizeFavorite(row);
    return favorite ? [favorite] : [];
  });
}
