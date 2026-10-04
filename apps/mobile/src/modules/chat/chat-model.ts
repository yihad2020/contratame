import type {
  ChatConversationListItem,
  ChatMessage,
  ChatMessageType,
  ChatMessageValidation,
  ChatMessageView,
  ConversationCursor,
  MessageCursor,
  RealtimeMessageRow,
  SendConversationMessageParams,
} from '@/modules/chat/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CHAT_MESSAGE_MAX_CHARACTERS = 2000;
export const CHAT_MESSAGE_COUNTER_THRESHOLD = 1800;

export function normalizeChatId(value: string | string[] | undefined) {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase();
  return UUID_PATTERN.test(clean) ? clean : null;
}

export function normalizeMessageText(value: string) {
  return value.trim().replace(/\s+/gu, ' ');
}

export function validateMessageText(value: string): ChatMessageValidation {
  const content = normalizeMessageText(value);
  const characterCount = Array.from(content).length;
  if (characterCount < 1) {
    return { ok: false, content, characterCount, message: 'Escribe un mensaje antes de enviarlo.' };
  }
  if (characterCount > CHAT_MESSAGE_MAX_CHARACTERS) {
    return {
      ok: false,
      content,
      characterCount,
      message: `El mensaje no puede superar ${CHAT_MESSAGE_MAX_CHARACTERS.toLocaleString('es-BO')} caracteres.`,
    };
  }
  return { ok: true, content, characterCount };
}

export function buildSendMessageParams(
  conversationId: string,
  messageId: string,
  value: string,
): SendConversationMessageParams {
  const cleanConversationId = normalizeChatId(conversationId);
  const cleanMessageId = normalizeChatId(messageId);
  const validation = validateMessageText(value);
  if (!cleanConversationId || !cleanMessageId || !validation.ok) throw new Error('invalid chat message');
  return {
    p_conversation_id: cleanConversationId,
    p_message_id: cleanMessageId,
    p_content: validation.content,
  };
}

function isMessageType(value: unknown): value is ChatMessageType {
  return value === 'text' || value === 'system';
}

export function normalizeChatMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.message_id !== 'string'
      || typeof row.conversation_id !== 'string'
      || !isMessageType(row.message_type)
      || typeof row.content !== 'string'
      || typeof row.created_at !== 'string') return null;
  return {
    message_id: row.message_id,
    conversation_id: row.conversation_id,
    sender_profile_id: typeof row.sender_profile_id === 'string' ? row.sender_profile_id : null,
    message_type: row.message_type,
    content: row.content,
    created_at: row.created_at,
  };
}

export function normalizeRealtimeMessage(row: RealtimeMessageRow): ChatMessage | null {
  return normalizeChatMessage({
    message_id: row.id,
    conversation_id: row.conversation_id,
    sender_profile_id: row.sender_profile_id,
    message_type: row.message_type,
    content: row.content,
    created_at: row.created_at,
  });
}

export function toMessageView(message: ChatMessage, callerId: string): ChatMessageView {
  return { ...message, is_mine: message.sender_profile_id === callerId };
}

export function mergeMessages(
  current: ChatMessageView[],
  incoming: ChatMessageView[],
): ChatMessageView[] {
  const byId = new Map(current.map((message) => [message.message_id, message]));
  incoming.forEach((message) => byId.set(message.message_id, message));
  return Array.from(byId.values()).sort((left, right) =>
    left.created_at.localeCompare(right.created_at)
      || left.message_id.localeCompare(right.message_id));
}

export function mergeConversationPages(
  current: ChatConversationListItem[],
  incoming: ChatConversationListItem[],
): ChatConversationListItem[] {
  const byId = new Map(current.map((conversation) => [conversation.conversation_id, conversation]));
  incoming.forEach((conversation) => byId.set(conversation.conversation_id, conversation));
  return Array.from(byId.values()).sort((left, right) =>
    right.activity_at.localeCompare(left.activity_at)
      || right.conversation_id.localeCompare(left.conversation_id));
}

export function oldestMessageCursor(messages: ChatMessageView[]): MessageCursor | null {
  const oldest = messages[0];
  return oldest ? { createdAt: oldest.created_at, id: oldest.message_id } : null;
}

export function newestMessageCursor(messages: ChatMessageView[]): MessageCursor | null {
  const newest = messages[messages.length - 1];
  return newest ? { createdAt: newest.created_at, id: newest.message_id } : null;
}

export function nextConversationCursor(items: ChatConversationListItem[]): ConversationCursor | null {
  const last = items[items.length - 1];
  return last ? { activityAt: last.activity_at, id: last.conversation_id } : null;
}

export function messagePreview(item: ChatConversationListItem) {
  if (!item.latest_message_content) return 'Sin mensajes todavía';
  const prefix = item.latest_message_is_mine ? 'Tú: ' : '';
  return `${prefix}${item.latest_message_content}`;
}

export function formatChatTime(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/La_Paz',
  }).format(new Date(value));
}

export function formatChatActivity(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(new Date(value));
}

