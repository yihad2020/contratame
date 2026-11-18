import { StatusPill, type StatusTone } from '@/components/ui/Kit';

const toneMap: Record<'success' | 'warning' | 'danger', StatusTone> = {
  success: 'success',
  warning: 'accent',
  danger: 'danger',
};

/** Legacy status badge API, rendered with the redesign's `StatusPill` (dot variant). */
export function StatusBadge({ label, tone = 'success' }: { label: string; tone?: 'success' | 'warning' | 'danger' }) {
  return <StatusPill dot label={label} tone={toneMap[tone]} />;
}
