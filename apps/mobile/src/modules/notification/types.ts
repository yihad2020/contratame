export type KnownNotificationType =
  | 'service_request_created'
  | 'quote_accepted'
  | 'booking_created'
  | 'booking_started'
  | 'booking_completion_requested'
  | 'booking_completed'
  | 'review_received'
  | 'message_received';

export type NotificationTargetType = 'service_request' | 'booking' | 'conversation';
export type NotificationConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'error';

export type AppNotification = {
  notification_id: string;
  notification_type: string;
  title: string;
  body: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  navigation_target_type: NotificationTargetType | null;
  navigation_target_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationCursor = { createdAt: string; id: string };

export type NotificationRoute =
  | { pathname: '/(app)/request/[requestId]'; params: { requestId: string } }
  | { pathname: '/(app)/booking/[bookingId]'; params: { bookingId: string } }
  | { pathname: '/(app)/chat/[conversationId]'; params: { conversationId: string } };
