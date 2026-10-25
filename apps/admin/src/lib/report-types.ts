export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';
export type ReportReason = 'misleading_profile' | 'inappropriate_behavior' | 'harassment' | 'fraud_or_scam' | 'unsafe_behavior' | 'service_issue' | 'other';

export type AdminReport = {
  report_id: string;
  reporter_profile_id: string;
  reporter_display_name: string;
  reported_profile_id: string;
  reported_display_name: string;
  booking_id: string | null;
  booking_service_title: string | null;
  booking_status: string | null;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  reviewed_by_profile_id: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
};

