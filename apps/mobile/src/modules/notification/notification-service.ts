import { supabase } from '@/lib/supabase';
import { normalizeNotification } from '@/modules/notification/notification-model';
import type { AppNotification, NotificationCursor } from '@/modules/notification/types';

export const NOTIFICATION_PAGE_SIZE = 20;
export const NOTIFICATION_SYNC_SIZE = 50;

function normalizeRows(data: unknown[] | null): AppNotification[] {
  return (data ?? []).flatMap((row) => {
    const notification = normalizeNotification(row);
    return notification ? [notification] : [];
  });
}

export async function listMyNotifications(
  cursor: NotificationCursor | null,
  limit = NOTIFICATION_PAGE_SIZE,
) {
  const { data, error } = await supabase.rpc('list_my_notifications', {
    p_before_created_at: cursor?.createdAt ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return normalizeRows(data);
}

export async function listMyNotificationsAfter(
  cursor: NotificationCursor,
  limit = NOTIFICATION_SYNC_SIZE,
) {
  const { data, error } = await supabase.rpc('list_my_notifications_after', {
    p_after_created_at: cursor.createdAt,
    p_after_id: cursor.id,
    p_limit: limit,
  });
  if (error) throw error;
  return normalizeRows(data);
}

export async function getMyNotificationUnreadCount() {
  const { data, error } = await supabase.rpc('get_my_notification_unread_count');
  if (error) throw error;
  return Number(data ?? 0);
}

export async function markMyNotificationRead(notificationId: string) {
  const { data, error } = await supabase
    .rpc('mark_my_notification_read', { p_notification_id: notificationId })
    .single();
  if (error) throw error;
  const row = data as { notification_id?: unknown; read_at?: unknown } | null;
  if (!row || typeof row.notification_id !== 'string' || typeof row.read_at !== 'string') {
    throw new Error('invalid notification read response');
  }
  return { notificationId: row.notification_id, readAt: row.read_at };
}
