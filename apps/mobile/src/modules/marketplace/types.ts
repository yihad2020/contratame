import type { PricingType, ServiceCategory } from '@/modules/worker/types';

export type MarketplaceSort = 'default' | 'distance' | 'experience_desc' | 'price_asc';

export type MarketplaceLocation = {
  latitude: number;
  longitude: number;
};

export type MarketplaceFilters = {
  query: string | null;
  categoryId: string | null;
  city: string | null;
  department: string | null;
  location: MarketplaceLocation | null;
  radiusM: number | null;
  pricingType: PricingType | null;
  minPriceBob: number | null;
  maxPriceBob: number | null;
  minYearsExperience: number | null;
  availabilityDay: number | null;
  sort: MarketplaceSort;
};

export type MarketplaceFilterDraft = {
  query: string;
  categoryId: string;
  city: string;
  department: string;
  location: MarketplaceLocation | null;
  radiusKm: string;
  pricingType: '' | PricingType;
  minPriceText: string;
  maxPriceText: string;
  minYearsText: string;
  availabilityDay: string;
  sort: MarketplaceSort;
};

export type MarketplaceResult = {
  worker_id: string;
  display_name: string;
  professional_bio: string | null;
  years_experience: number | null;
  public_area_label: string;
  city: string;
  department: string;
  service_radius_m: number;
  service_id: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  service_title: string;
  service_description: string | null;
  pricing_type: PricingType;
  price_bob: number | null;
  distance_m: number | null;
  total_count: number;
};

export type MarketplaceCategory = Pick<ServiceCategory, 'id' | 'name' | 'slug' | 'icon_key' | 'sort_order'>;
