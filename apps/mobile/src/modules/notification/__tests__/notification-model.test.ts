import { notificationFailureMessage } from '@/modules/notification/notification-errors';
import {
  countUnreadNotifications,
  formatNotificationTimestamp,
  mergeNotifications,
  newestNotificationCursor,
  normalizeNotification,
  notificationIcon,
  notificationRoute,
  oldestNotificationCursor,
} from '@/modules/notification/notification-model';
import type { AppNotification } from '@/modules/notification/types';

const notificationId = 'a0000000-0000-4000-8000-000000000001';
const targetId = 'b0000000-0000-4000-8000-000000000001';

function notification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    notification_id: notificationId,
    notification_type: 'service_request_created',
    title: 'Nueva solicitud de servicio',
    body: 'Recibiste una nueva solicitud.',
    related_entity_type: 'service_request',
    related_entity_id: targetId,
    navigation_target_type: 'service_request',
    navigation_target_id: targetId,
    read_at: null,
    created_at: '2026-10-04T16:00:00Z',
    ...overrides,
  };
}

describe('MOD-11 notification model', () => {
  test('normalizes the controlled notification allowlist without fabricating content', () => {
    expect(normalizeNotification(notification())).toEqual(notification());
  });

  test('rejects malformed rows and invalid identifiers', () => {
    expect(normalizeNotification(null)).toBeNull();
    expect(normalizeNotification({ ...notification(), notification_id: 'invalid' })).toBeNull();
    expect(normalizeNotification({ ...notification(), title: null })).toBeNull();
  });

  test('drops an incomplete or unsupported navigation target while preserving the event', () => {
    expect(normalizeNotification({
      ...notification(),
      navigation_target_type: 'review',
      navigation_target_id: targetId,
    })).toEqual(expect.objectContaining({
      notification_type: 'service_request_created',
      navigation_target_type: null,
      navigation_target_id: null,
    }));
    expect(normalizeNotification({
      ...notification(),
      navigation_target_type: 'booking',
      navigation_target_id: null,
    })).toEqual(expect.objectContaining({
      navigation_target_type: null,
      navigation_target_id: null,
    }));
  });

  test('maps every existing event type to product iconography', () => {
    expect([
      'service_request_created',
      'quote_accepted',
      'booking_created',
      'booking_started',
      'booking_completion_requested',
      'booking_completed',
      'review_received',
      'message_received',
    ].map(notificationIcon)).toEqual([
      'requests', 'check', 'briefcase', 'tools', 'time', 'check', 'star', 'chat',
    ]);
    expect(notificationIcon('future_unknown_event')).toBe('notifications');
  });

  test('resolves only existing request, booking and conversation routes', () => {
    expect(notificationRoute(notification())).toEqual({
      pathname: '/(app)/request/[requestId]', params: { requestId: targetId },
    });
    expect(notificationRoute(notification({
      navigation_target_type: 'booking', navigation_target_id: targetId,
    }))).toEqual({ pathname: '/(app)/booking/[bookingId]', params: { bookingId: targetId } });
    expect(notificationRoute(notification({
      navigation_target_type: 'conversation', navigation_target_id: targetId,
    }))).toEqual({ pathname: '/(app)/chat/[conversationId]', params: { conversationId: targetId } });
    expect(notificationRoute(notification({
      navigation_target_type: null, navigation_target_id: null,
    }))).toBeNull();
  });

  test('deduplicates realtime and paged results using deterministic newest-first order', () => {
    const older = notification({ created_at: '2026-10-04T15:00:00Z' });
    const laterId = 'a0000000-0000-4000-8000-000000000002';
    const newer = notification({ notification_id: laterId, created_at: '2026-10-04T17:00:00Z' });
    const read = notification({ read_at: '2026-10-04T18:00:00Z' });
    expect(mergeNotifications([older, newer], [read, newer])).toEqual([newer, read]);
  });

  test('uses UUID as a deterministic tie-breaker only after timestamp equality', () => {
    const lower = notification({ notification_id: 'a0000000-0000-4000-8000-000000000001' });
    const higher = notification({ notification_id: 'a0000000-0000-4000-8000-000000000002' });
    expect(mergeNotifications([lower], [higher])).toEqual([higher, lower]);
  });

  test('derives the exact pagination and reconnect cursors', () => {
    const newest = notification({ notification_id: 'a0000000-0000-4000-8000-000000000002' });
    const oldest = notification({
      notification_id: 'a0000000-0000-4000-8000-000000000001',
      created_at: '2026-10-04T15:00:00Z',
    });
    expect(newestNotificationCursor([newest, oldest])).toEqual({
      createdAt: newest.created_at, id: newest.notification_id,
    });
    expect(oldestNotificationCursor([newest, oldest])).toEqual({
      createdAt: oldest.created_at, id: oldest.notification_id,
    });
    expect(oldestNotificationCursor([])).toBeNull();
  });

  test('aggregates unread state without counting persisted read rows', () => {
    expect(countUnreadNotifications([
      notification(),
      notification({ notification_id: 'a0000000-0000-4000-8000-000000000002' }),
      notification({
        notification_id: 'a0000000-0000-4000-8000-000000000003',
        read_at: '2026-10-04T17:00:00Z',
      }),
    ])).toBe(2);
  });

  test('formats recent timestamps in Spanish', () => {
    const now = new Date('2026-10-04T16:30:00Z');
    expect(formatNotificationTimestamp('2026-10-04T16:30:00Z', now)).toBe('Ahora');
    expect(formatNotificationTimestamp('2026-10-04T16:05:00Z', now)).toBe('Hace 25 min');
    expect(formatNotificationTimestamp('2026-10-04T14:30:00Z', now)).toBe('Hace 2 h');
  });

  test('uses the America/La_Paz timezone for absolute timestamps', () => {
    const formatted = formatNotificationTimestamp(
      '2026-10-01T04:30:00Z',
      new Date('2026-10-04T16:30:00Z'),
    );
    expect(formatted).toMatch(/1 oct(?: de)? 2026/);
    expect(formatted).toContain('12:30');
  });

  test('maps network, authorization, validation and unknown failures without leaking details', () => {
    expect(notificationFailureMessage({ message: 'Network request failed' })).toContain('conexión');
    expect(notificationFailureMessage({ code: '42501', message: 'internal' })).toContain('permiso');
    expect(notificationFailureMessage({ code: '22023', message: 'internal' })).toContain('válida');
    expect(notificationFailureMessage({ code: 'XX000', message: 'secret SQL detail' })).not.toContain('secret');
  });
});
