import type { AppIconName } from '@/components/ui/AppIcon';
import type {
  AppNotification,
  KnownNotificationType,
  NotificationCursor,
  NotificationRoute,
  NotificationTargetType,
} from '@/modules/notification/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const eventIcons: Record<KnownNotificationType, AppIconName> = {
  service_request_created: 'requests',
  quote_accepted: 'check',
  booking_created: 'briefcase',
  booking_started: 'tools',
  booking_completion_requested: 'time',
  booking_completed: 'check',
  review_received: 'star',
  message_received: 'chat',
};

function isTargetType(value: unknown): value is NotificationTargetType {
  return value === 'service_request' || value === 'booking' || value === 'conversation';
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

export function normalizeNotification(value: unknown): AppNotification | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.notification_id !== 'string'
      || !UUID_PATTERN.test(row.notification_id)
      || typeof row.notification_type !== 'string'
      || typeof row.title !== 'string'
      || typeof row.body !== 'string'
      || typeof row.created_at !== 'string') return null;

  const targetType = isTargetType(row.navigation_target_type)
    ? row.navigation_target_type
    : null;
  const targetId = typeof row.navigation_target_id === 'string'
    && UUID_PATTERN.test(row.navigation_target_id)
    ? row.navigation_target_id
    : null;

  return {
    notification_id: row.notification_id,
    notification_type: row.notification_type,
    title: row.title,
    body: row.body,
    related_entity_type: optionalString(row.related_entity_type),
    related_entity_id: optionalString(row.related_entity_id),
    navigation_target_type: targetType && targetId ? targetType : null,
    navigation_target_id: targetType && targetId ? targetId : null,
    read_at: optionalString(row.read_at),
    created_at: row.created_at,
  };
}

export function notificationIcon(type: string): AppIconName {
  return eventIcons[type as KnownNotificationType] ?? 'notifications';
}

export function notificationRoute(notification: AppNotification): NotificationRoute | null {
  const id = notification.navigation_target_id;
  if (!id || !notification.navigation_target_type) return null;
  if (notification.navigation_target_type === 'service_request') {
    return { pathname: '/(app)/request/[requestId]', params: { requestId: id } };
  }
  if (notification.navigation_target_type === 'booking') {
    return { pathname: '/(app)/booking/[bookingId]', params: { bookingId: id } };
  }
  return { pathname: '/(app)/chat/[conversationId]', params: { conversationId: id } };
}

export function mergeNotifications(
  current: AppNotification[],
  incoming: AppNotification[],
): AppNotification[] {
  const byId = new Map(current.map((notification) => [notification.notification_id, notification]));
  incoming.forEach((notification) => byId.set(notification.notification_id, notification));
  return Array.from(byId.values()).sort((left, right) =>
    right.created_at.localeCompare(left.created_at)
      || right.notification_id.localeCompare(left.notification_id));
}

export function oldestNotificationCursor(items: AppNotification[]): NotificationCursor | null {
  const oldest = items[items.length - 1];
  return oldest ? { createdAt: oldest.created_at, id: oldest.notification_id } : null;
}

export function newestNotificationCursor(items: AppNotification[]): NotificationCursor | null {
  const newest = items[0];
  return newest ? { createdAt: newest.created_at, id: newest.notification_id } : null;
}

export function countUnreadNotifications(items: AppNotification[]) {
  return items.reduce((total, item) => total + (item.read_at ? 0 : 1), 0);
}

export function formatNotificationTimestamp(value: string, now = new Date()) {
  const date = new Date(value);
  const elapsedMs = Math.max(0, now.getTime() - date.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  if (elapsedMinutes < 1) return 'Ahora';
  if (elapsedMinutes < 60) return `Hace ${elapsedMinutes} min`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Hace ${elapsedHours} h`;
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(date);
}
