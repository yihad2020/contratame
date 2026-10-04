export type ConversationStatus = 'active' | 'closed';
export type ChatPerspective = 'customer' | 'worker';
export type ChatMessageType = 'text' | 'system';
export type ChatConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'error';

export type ChatConversation = {
  conversation_id: string;
  service_request_id: string;
  conversation_status: ConversationStatus;
  perspective: ChatPerspective;
  customer_display_name: string;
  worker_display_name: string;
  service_title: string;
  request_status: string;
  created_at: string;
  activity_at: string;
};

export type ChatConversationListItem = {
  conversation_id: string;
  service_request_id: string;
  conversation_status: ConversationStatus;
  perspective: ChatPerspective;
  counterpart_display_name: string;
  service_title: string;
  request_status: string;
  latest_message_type: ChatMessageType | null;
  latest_message_content: string | null;
  latest_message_is_mine: boolean | null;
  latest_message_at: string | null;
  activity_at: string;
};

export type ChatMessage = {
  message_id: string;
  conversation_id: string;
  sender_profile_id: string | null;
  message_type: ChatMessageType;
  content: string;
  created_at: string;
};

export type ChatMessageView = ChatMessage & { is_mine: boolean };

export type ChatMessageValidation =
  | { ok: true; content: string; characterCount: number }
  | { ok: false; content: string; characterCount: number; message: string };

export type ConversationCursor = { activityAt: string; id: string };
export type MessageCursor = { createdAt: string; id: string };

export type SendConversationMessageParams = {
  p_conversation_id: string;
  p_message_id: string;
  p_content: string;
};

export type RealtimeMessageRow = {
  id: string;
  conversation_id: string;
  sender_profile_id: string | null;
  message_type: string;
  content: string;
  created_at: string;
};

