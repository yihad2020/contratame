import 'react-native-get-random-values';

import { supabase } from '@/lib/supabase';
import {
  buildSendMessageParams,
  normalizeChatMessage,
} from '@/modules/chat/chat-model';
import type {
  ChatConversation,
  ChatConversationListItem,
  ChatMessage,
  ConversationCursor,
  MessageCursor,
} from '@/modules/chat/types';

export const CHAT_LIST_PAGE_SIZE = 12;
export const CHAT_HISTORY_PAGE_SIZE = 30;
export const CHAT_SYNC_PAGE_SIZE = 50;

export function createChatMessageId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function getMyConversation(conversationId: string): Promise<ChatConversation | null> {
  const { data, error } = await supabase
    .rpc('get_my_conversation', { p_conversation_id: conversationId })
    .maybeSingle();
  if (error) throw error;
  return data as ChatConversation | null;
}

export async function getMyConversationForRequest(requestId: string): Promise<ChatConversation | null> {
  const { data, error } = await supabase
    .rpc('get_my_conversation_for_request', { p_service_request_id: requestId })
    .maybeSingle();
  if (error) throw error;
  return data as ChatConversation | null;
}

export async function listMyConversations(
  cursor: ConversationCursor | null,
  limit = CHAT_LIST_PAGE_SIZE,
): Promise<ChatConversationListItem[]> {
  const { data, error } = await supabase.rpc('list_my_conversations', {
    p_before_activity_at: cursor?.activityAt ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as ChatConversationListItem[];
}

export async function listConversationMessages(
  conversationId: string,
  cursor: MessageCursor | null,
  limit = CHAT_HISTORY_PAGE_SIZE,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc('list_conversation_messages', {
    p_conversation_id: conversationId,
    p_before_created_at: cursor?.createdAt ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []).flatMap((row: unknown) => {
    const message = normalizeChatMessage(row);
    return message ? [message] : [];
  });
}

export async function listConversationMessagesAfter(
  conversationId: string,
  cursor: MessageCursor,
  limit = CHAT_SYNC_PAGE_SIZE,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc('list_conversation_messages_after', {
    p_conversation_id: conversationId,
    p_after_created_at: cursor.createdAt,
    p_after_id: cursor.id,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []).flatMap((row: unknown) => {
    const message = normalizeChatMessage(row);
    return message ? [message] : [];
  });
}

export async function sendConversationMessage(
  conversationId: string,
  messageId: string,
  content: string,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .rpc('send_conversation_message', buildSendMessageParams(conversationId, messageId, content))
    .single();
  if (error) throw error;
  const message = normalizeChatMessage(data);
  if (!message) throw new Error('invalid message response');
  return message;
}

