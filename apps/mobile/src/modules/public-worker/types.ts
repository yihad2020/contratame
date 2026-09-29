import type { PricingType } from '@/modules/worker/types';

export type PublicWorkerService = {
  service_id: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  category_icon_key: string | null;
  title: string;
  description: string | null;
  pricing_type: PricingType;
  price_bob: number | null;
};

export type PublicWorkerAvailability = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type PublicWorkerPortfolioItem = {
  portfolio_item_id: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  sort_order: number;
  signed_url: string | null;
};

export type PublicWorkerProfile = {
  worker_id: string;
  display_name: string;
  professional_bio: string | null;
  years_experience: number | null;
  public_area_label: string;
  city: string;
  department: string;
  service_radius_m: number;
  services: PublicWorkerService[];
  availability: PublicWorkerAvailability[];
  portfolio: PublicWorkerPortfolioItem[];
};

export type PublicWorkerProfileLoad = {
  profile: PublicWorkerProfile;
  portfolioImageWarning: boolean;
};

export type PublicWorkerProfileRpcRow = Omit<PublicWorkerProfile, 'services' | 'availability' | 'portfolio'> & {
  services: (Omit<PublicWorkerService, 'price_bob'> & { price_bob: unknown })[];
  availability: PublicWorkerAvailability[];
  portfolio: Omit<PublicWorkerPortfolioItem, 'signed_url'>[];
};

export type PortfolioSignedUrl = {
  path: string | null;
  signedUrl: string | null;
  error: string | null;
};
