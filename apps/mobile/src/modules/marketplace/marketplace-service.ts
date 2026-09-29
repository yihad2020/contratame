import { supabase } from '@/lib/supabase';
import type { MarketplaceCategory, MarketplaceFilters, MarketplaceResult } from '@/modules/marketplace/types';
import { buildMarketplaceRpcParams } from '@/modules/marketplace/validation';

export const MARKETPLACE_PAGE_SIZE = 12;

export async function loadMarketplaceCategories(): Promise<MarketplaceCategory[]> {
  const { data, error } = await supabase
    .from('service_categories')
    .select('id,name,slug,icon_key,sort_order')
    .eq('active', true)
    .order('sort_order')
    .order('id');
  if (error) throw error;
  return (data ?? []) as MarketplaceCategory[];
}

export async function searchMarketplace(
  filters: MarketplaceFilters,
  offset: number,
  limit = MARKETPLACE_PAGE_SIZE,
): Promise<MarketplaceResult[]> {
  const { data, error } = await supabase.rpc(
    'search_marketplace_workers',
    buildMarketplaceRpcParams(filters, offset, limit),
  );
  if (error) throw error;
  return ((data ?? []) as MarketplaceResult[]).map((result) => ({
    ...result,
    price_bob: result.price_bob === null ? null : Number(result.price_bob),
    distance_m: result.distance_m === null ? null : Number(result.distance_m),
    total_count: Number(result.total_count),
  }));
}
