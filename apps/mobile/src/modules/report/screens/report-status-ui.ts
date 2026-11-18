import type { IconName } from '@/components/ui/Icon';
import type { StatusTone } from '@/components/ui/Kit';
import type { ReportStatus } from '@/modules/report/types';

/** Presentation-only mapping of report states to the redesign's status pill tones. */
export function reportStatusTone(status: ReportStatus): StatusTone {
  if (status === 'resolved') return 'success';
  if (status === 'dismissed') return 'danger';
  if (status === 'under_review') return 'info';
  return 'accent';
}

export function reportStatusIcon(status: ReportStatus): IconName {
  if (status === 'resolved') return 'check-circle';
  if (status === 'dismissed') return 'close-circle';
  if (status === 'under_review') return 'magnify';
  return 'clock-time-four';
}
