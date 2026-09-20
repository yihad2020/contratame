export type WorkerApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'suspended';
export type PricingType = 'hourly' | 'daily' | 'fixed' | 'quote';

export type WorkerProfile = {
  id: string;
  profile_id: string;
  bio: string | null;
  years_experience: number | null;
  approval_status: WorkerApprovalStatus;
  created_at: string;
  updated_at: string;
};

export type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
  icon_key: string | null;
  active: boolean;
  sort_order: number;
};

export type WorkerService = {
  id: string;
  worker_id: string;
  category_id: string;
  title: string;
  description: string | null;
  pricing_type: PricingType;
  price_bob: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkerLocation = {
  worker_id: string;
  private_location: unknown;
  public_location: unknown | null;
  public_area_label: string;
  city: string;
  department: string;
  country_code: 'BO';
  service_radius_m: number;
  updated_at: string;
  latitude: number | null;
  longitude: number | null;
};

export type WorkerAvailability = {
  id: string;
  worker_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkerPortfolioItem = {
  id: string;
  worker_id: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  preview_url?: string;
};

export type WorkerDraft = {
  worker: WorkerProfile;
  categories: ServiceCategory[];
  services: WorkerService[];
  location: WorkerLocation | null;
  availability: WorkerAvailability[];
  portfolio: WorkerPortfolioItem[];
};

export type CompletionSection = {
  key: 'profile' | 'services' | 'location' | 'availability' | 'portfolio';
  title: string;
  step: 1 | 2 | 3 | 4 | 5;
  complete: boolean;
  optional?: boolean;
  detail: string;
};

export const pricingLabels: Record<PricingType, string> = {
  hourly: 'Por hora',
  daily: 'Por día',
  fixed: 'Precio fijo',
  quote: 'Cotización',
};

export const weekdayLabels = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;
