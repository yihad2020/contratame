export type CertificationStatus = 'pending_payment' | 'active' | 'expired' | 'cancelled';

export type AdminCertification = {
  membership_id: string;
  worker_id: string;
  owner_profile_id: string;
  worker_display_name: string;
  worker_approval_status: string;
  account_status: string;
  certification_status: CertificationStatus;
  price_bob: number | string;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

