import { chatFailureMessage } from '@/modules/chat/chat-errors';
import {
  buildSendMessageParams,
  CHAT_MESSAGE_COUNTER_THRESHOLD,
  CHAT_MESSAGE_MAX_CHARACTERS,
  mergeConversationPages,
  mergeMessages,
  messagePreview,
  newestMessageCursor,
  normalizeChatId,
  normalizeMessageText,
  oldestMessageCursor,
  toMessageView,
  validateMessageText,
} from '@/modules/chat/chat-model';
import type { ChatConversationListItem, ChatMessageView } from '@/modules/chat/types';

const conversationId = 'a0000000-0000-4000-8000-000000000001';
const messageId = 'b0000000-0000-4000-8000-000000000001';
const callerId = 'c0000000-0000-4000-8000-000000000001';

function message(id: string, createdAt: string, isMine = false): ChatMessageView {
  return {
    message_id: id,
    conversation_id: conversationId,
    sender_profile_id: isMine ? callerId : 'd0000000-0000-4000-8000-000000000001',
    message_type: 'text',
    content: id,
    created_at: createdAt,
    is_mine: isMine,
  };
}

function conversation(id: string, activityAt: string): ChatConversationListItem {
  return {
    conversation_id: id,
    service_request_id: 'e0000000-0000-4000-8000-000000000001',
    conversation_status: 'active',
    perspective: 'customer',
    counterpart_display_name: 'Ana Profesional',
    service_title: 'Instalación eléctrica',
    request_status: 'pending',
    latest_message_type: null,
    latest_message_content: null,
    latest_message_is_mine: null,
    latest_message_at: null,
    activity_at: activityAt,
  };
}

describe('MOD-10 chat model', () => {
  test('normalizes route identifiers without accepting arrays or malformed values', () => {
    expect(normalizeChatId(` ${conversationId.toUpperCase()} `)).toBe(conversationId);
    expect(normalizeChatId([conversationId])).toBeNull();
    expect(normalizeChatId('invalid')).toBeNull();
  });

  test('normalizes whitespace without silently truncating message content', () => {
    expect(normalizeMessageText('  Hola\n\t mundo   desde chat  ')).toBe('Hola mundo desde chat');
  });

  test('rejects empty and whitespace-only messages', () => {
    expect(validateMessageText('').ok).toBe(false);
    expect(validateMessageText(' \n\t ').ok).toBe(false);
  });

  test('accepts exactly 2,000 Unicode characters and rejects 2,001', () => {
    const exact = 'á'.repeat(CHAT_MESSAGE_MAX_CHARACTERS);
    const oversized = `${exact}á`;
    expect(validateMessageText(exact)).toEqual(expect.objectContaining({ ok: true, characterCount: 2000 }));
    expect(validateMessageText(oversized)).toEqual(expect.objectContaining({ ok: false, characterCount: 2001 }));
  });

  test('counts Unicode code points with Array.from semantics', () => {
    const result = validateMessageText('🧰⚡');
    expect(result).toEqual(expect.objectContaining({ ok: true, characterCount: 2 }));
    expect(CHAT_MESSAGE_COUNTER_THRESHOLD).toBe(1800);
  });

  test('builds the controlled RPC payload without sender or message type', () => {
    const payload = buildSendMessageParams(conversationId, messageId, ' Hola   mundo ');
    expect(payload).toEqual({
      p_conversation_id: conversationId,
      p_message_id: messageId,
      p_content: 'Hola mundo',
    });
    expect(payload).not.toHaveProperty('sender_profile_id');
    expect(payload).not.toHaveProperty('message_type');
  });

  test('derives sender ownership from the authenticated profile id', () => {
    const base = message(messageId, '2026-10-04T12:00:00Z');
    const theirs = toMessageView(base, callerId);
    expect(toMessageView({ ...base, sender_profile_id: callerId }, callerId).is_mine).toBe(true);
    expect(theirs.is_mine).toBe(false);
  });

  test('deduplicates initial/realtime messages and orders deterministically', () => {
    const later = message('b0000000-0000-4000-8000-000000000002', '2026-10-04T12:01:00Z');
    const earlier = message(messageId, '2026-10-04T12:00:00Z');
    const updated = { ...earlier, content: 'normalizado' };
    expect(mergeMessages([later, earlier], [updated, later])).toEqual([updated, later]);
  });

  test('produces oldest/newest cursors for pagination and reconnect synchronization', () => {
    const first = message(messageId, '2026-10-04T12:00:00Z');
    const last = message('b0000000-0000-4000-8000-000000000002', '2026-10-04T12:01:00Z');
    expect(oldestMessageCursor([first, last])).toEqual({ createdAt: first.created_at, id: first.message_id });
    expect(newestMessageCursor([first, last])).toEqual({ createdAt: last.created_at, id: last.message_id });
    expect(newestMessageCursor([])).toBeNull();
  });

  test('deduplicates and reorders conversation pages by latest activity', () => {
    const older = conversation('a0000000-0000-4000-8000-000000000002', '2026-10-04T11:00:00Z');
    const newer = conversation(conversationId, '2026-10-04T12:00:00Z');
    const refreshed = { ...older, activity_at: '2026-10-04T13:00:00Z' };
    expect(mergeConversationPages([older, newer], [refreshed])).toEqual([refreshed, newer]);
  });

  test('uses a neutral empty preview and marks own latest message safely', () => {
    const empty = conversation(conversationId, '2026-10-04T12:00:00Z');
    expect(messagePreview(empty)).toBe('Sin mensajes todavía');
    expect(messagePreview({ ...empty, latest_message_content: 'Listo', latest_message_is_mine: true })).toBe('Tú: Listo');
  });

  test('maps authorization, closed, validation, network and unknown errors safely', () => {
    expect(chatFailureMessage({ code: '42501', message: 'internal' })).toContain('permiso');
    expect(chatFailureMessage({ code: '55000', message: 'conversation is closed' })).toContain('cerrada');
    expect(chatFailureMessage({ code: '22023', message: 'message must contain between 1 and 2000 characters' })).toContain('2.000');
    expect(chatFailureMessage({ message: 'Network request failed' })).toContain('conexión');
    expect(chatFailureMessage({ code: 'XX000', message: 'secret SQL detail' })).not.toContain('secret');
  });
});

