export type ReportContext = 'profile' | 'booking';
export type ReportReason = 'misleading_profile' | 'inappropriate_behavior' | 'harassment' | 'fraud_or_scam' | 'unsafe_behavior' | 'service_issue' | 'other';
export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';

export type UserReport = {
  report_id: string;
  context_type: ReportContext;
  reported_display_name: string | null;
  reported_context_available: boolean;
  booking_id: string | null;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  created_at: string;
  reviewed_at: string | null;
};

export type ReportCursor = { createdAt: string; reportId: string };

