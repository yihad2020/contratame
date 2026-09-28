export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type SnapshotService = {
  category_name?: string;
  title?: string;
  description?: string;
  pricing_type?: string;
  price_bob?: number | null;
};

export type SnapshotAvailability = {
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
};

export type SnapshotPortfolio = {
  storage_path?: string;
  title?: string;
  description?: string | null;
  sort_order?: number;
  signedUrl?: string;
};

export type ApprovalSnapshot = {
  snapshot_version?: number;
  professional_profile?: { bio?: string; years_experience?: number };
  services?: SnapshotService[];
  location?: {
    private_location_geojson?: { coordinates?: [number, number] };
    public_area_label?: string;
    city?: string;
    department?: string;
    country_code?: string;
    service_radius_m?: number;
  };
  availability?: SnapshotAvailability[];
  portfolio?: SnapshotPortfolio[];
};

export type ApprovalRequest = {
  id: string;
  worker_id: string;
  status: ApprovalStatus;
  profile_snapshot: ApprovalSnapshot;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by_profile_id: string | null;
  rejection_reason: string | null;
  created_at: string;
};

export type AccountSummary = { first_name: string; last_name: string };

export type ApprovalListItem = ApprovalRequest & {
  account: AccountSummary | null;
};
