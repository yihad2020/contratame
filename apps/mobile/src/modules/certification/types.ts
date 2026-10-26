export type CertificationDisplayState =
  | 'not_eligible'
  | 'eligible'
  | 'pending'
  | 'active'
  | 'rejected'
  | 'expired';

export type CertificationState = {
  worker_id: string | null;
  worker_approval_status: string | null;
  certification_id: string | null;
  membership_status: 'pending_payment' | 'active' | 'expired' | 'cancelled' | null;
  display_state: CertificationDisplayState;
  price_bob: number;
  starts_at: string | null;
  expires_at: string | null;
  can_request: boolean;
};

export type CertificationStateRpcRow = Omit<CertificationState, 'price_bob'> & {
  price_bob: unknown;
};

export type PublicWorkerCertification = {
  worker_id: string;
  is_verified: boolean;
  certification_expires_at: string | null;
};

