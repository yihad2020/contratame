import type { IconName } from '@/components/ui/Icon';
import type { StatusTone } from '@/components/ui/Kit';
import type { BookingStatus } from '@/modules/booking/types';

/** Presentation-only mapping of booking states to the redesign's status pill tones. */
export function bookingStatusTone(status: BookingStatus): StatusTone {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'in_progress') return 'info';
  return 'accent';
}

export function bookingStatusIcon(status: BookingStatus): IconName {
  if (status === 'completed') return 'check-circle';
  if (status === 'cancelled') return 'close-circle';
  if (status === 'in_progress') return 'cog';
  if (status === 'completion_pending') return 'alert-circle';
  return 'clock-time-four';
}
