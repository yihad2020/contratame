import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';
import { chatFailureMessage } from '@/modules/chat/chat-errors';
import {
  CHAT_MESSAGE_COUNTER_THRESHOLD,
  CHAT_MESSAGE_MAX_CHARACTERS,
  formatChatTime,
  mergeMessages,
  newestMessageCursor,
  normalizeChatId,
  normalizeMessageText,
  oldestMessageCursor,
  toMessageView,
  validateMessageText,
} from '@/modules/chat/chat-model';
import { subscribeToConversation } from '@/modules/chat/chat-realtime';
import {
  CHAT_HISTORY_PAGE_SIZE,
  CHAT_SYNC_PAGE_SIZE,
  createChatMessageId,
  getMyConversation,
  getMyConversationForRequest,
  listConversationMessages,
  listConversationMessagesAfter,
  sendConversationMessage,
} from '@/modules/chat/chat-service';
import type {
  ChatConnectionState,
  ChatConversation,
  ChatMessage,
  ChatMessageView,
} from '@/modules/chat/types';

type ContextState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; value: ChatConversation };

export function ConversationScreen({
  conversationIdParam,
  requestIdParam,
}: {
  conversationIdParam?: string | string[];
  requestIdParam?: string | string[];
}) {
  const conversationId = normalizeChatId(conversationIdParam);
  const requestId = normalizeChatId(requestIdParam);
  const { user } = useAuth();
  const callerId = user?.id ?? '';
  const [context, setContext] = useState<ContextState>(conversationId || requestId ? { kind: 'loading' } : { kind: 'unavailable' });
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [historyFailure, setHistoryFailure] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [connection, setConnection] = useState<ChatConnectionState>('connecting');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendFailure, setSendFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const messagesRef = useRef<ChatMessageView[]>([]);
  const pendingRef = useRef<{ id: string; content: string } | null>(null);
  const sendingRef = useRef(false);
  const syncingRef = useRef(false);
  const listRef = useRef<FlatList<ChatMessageView>>(null);
  const scrollAfterChangeRef = useRef(true);

  function applyMessages(incoming: ChatMessage[], shouldScroll = false) {
    if (!callerId) return;
    const views = incoming.map((message) => toMessageView(message, callerId));
    const next = mergeMessages(messagesRef.current, views);
    messagesRef.current = next;
    scrollAfterChangeRef.current = shouldScroll;
    setMessages(next);
  }

  async function reconcile(targetConversationId: string) {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      let cursor = newestMessageCursor(messagesRef.current);
      if (!cursor) {
        const page = await listConversationMessages(targetConversationId, null);
        applyMessages(page, true);
        setHasOlder(page.length === CHAT_HISTORY_PAGE_SIZE);
        return;
      }
      let page: ChatMessage[];
      do {
        page = await listConversationMessagesAfter(targetConversationId, cursor);
        if (page.length) {
          applyMessages(page, true);
          const newest = page[page.length - 1];
          cursor = { createdAt: newest.created_at, id: newest.message_id };
        }
      } while (page.length === CHAT_SYNC_PAGE_SIZE);
    } catch (cause) {
      setConnection('error');
      setHistoryFailure(chatFailureMessage(cause));
    } finally {
      syncingRef.current = false;
    }
  }

  useEffect(() => {
    let current = true;
    let unsubscribe = () => {};
    messagesRef.current = [];

    async function setup() {
      try {
        const chat = conversationId
          ? await getMyConversation(conversationId)
          : requestId ? await getMyConversationForRequest(requestId) : null;
        if (!current) return;
        if (!chat) {
          setContext({ kind: 'unavailable' });
          setLoadingMessages(false);
          return;
        }
        setContext({ kind: 'ready', value: chat });
        unsubscribe = subscribeToConversation(
          chat.conversation_id,
          (message) => {
            if (!current) return;
            applyMessages([message], true);
          },
          (status) => {
            if (!current) return;
            setConnection(status);
            if (status === 'connected') void reconcile(chat.conversation_id);
          },
        );
        const page = await listConversationMessages(chat.conversation_id, null);
        if (!current) return;
        applyMessages(page, true);
        setHasOlder(page.length === CHAT_HISTORY_PAGE_SIZE);
        setLoadingMessages(false);
      } catch (cause) {
        if (!current) return;
        setContext({ kind: 'error', message: chatFailureMessage(cause) });
        setLoadingMessages(false);
      }
    }

    void setup();
    return () => {
      current = false;
      unsubscribe();
    };
  // applyMessages and reconcile intentionally use refs to reconcile the active subscription.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, callerId, conversationId, requestId]);

  async function loadOlder() {
    if (context.kind !== 'ready' || loadingOlder) return;
    const cursor = oldestMessageCursor(messagesRef.current);
    if (!cursor) return;
    setLoadingOlder(true);
    setHistoryFailure(null);
    try {
      const page = await listConversationMessages(context.value.conversation_id, cursor);
      applyMessages(page, false);
      setHasOlder(page.length === CHAT_HISTORY_PAGE_SIZE);
    } catch (cause) {
      setHistoryFailure(chatFailureMessage(cause));
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send() {
    if (context.kind !== 'ready' || context.value.conversation_status !== 'active' || sendingRef.current) return;
    const validation = validateMessageText(draft);
    if (!validation.ok) {
      setSendFailure(validation.message);
      return;
    }
    const pending = pendingRef.current?.content === validation.content
      ? pendingRef.current
      : { id: createChatMessageId(), content: validation.content };
    pendingRef.current = pending;
    sendingRef.current = true;
    setSending(true);
    setSendFailure(null);
    try {
      const message = await sendConversationMessage(context.value.conversation_id, pending.id, pending.content);
      applyMessages([message], true);
      pendingRef.current = null;
      setDraft('');
    } catch (cause) {
      await reconcile(context.value.conversation_id);
      if (messagesRef.current.some((message) => message.message_id === pending.id)) {
        pendingRef.current = null;
        setDraft('');
      } else {
        setSendFailure(chatFailureMessage(cause));
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  const ready = context.kind === 'ready' ? context.value : null;
  const counterpart = ready
    ? ready.perspective === 'customer' ? ready.worker_display_name : ready.customer_display_name
    : 'Conversación';
  const validation = validateMessageText(draft);

  return (
    <Screen
      scroll={false}
      contentStyle={styles.screen}
      header={<MarketplaceHeader back={() => router.back()} eyebrow="CHAT" title={counterpart} subtitle={ready?.service_title ?? 'Solicitud de servicio'} />}
      footer={ready ? (
        <Composer
          closed={ready.conversation_status === 'closed'}
          draft={draft}
          validation={validation}
          sending={sending}
          failure={sendFailure}
          onChange={(value) => {
            if (pendingRef.current?.content !== normalizeMessageText(value)) pendingRef.current = null;
            setDraft(value);
            setSendFailure(null);
          }}
          onSend={() => void send()}
        />
      ) : undefined}
    >
      {context.kind === 'loading' ? <StateLoading /> : null}
      {context.kind === 'unavailable' ? <StateUnavailable /> : null}
      {context.kind === 'error' ? (
        <View style={styles.state}>
          <ErrorMessage>{context.message}</ErrorMessage>
          <AppButton label="Reintentar" onPress={() => {
            messagesRef.current = [];
            setMessages([]);
            setContext({ kind: 'loading' });
            setLoadingMessages(true);
            setHistoryFailure(null);
            setConnection('connecting');
            setAttempt((value) => value + 1);
          }} />
        </View>
      ) : null}
      {ready ? (
        <>
          <ConnectionNotice state={connection} onRetry={() => void reconcile(ready.conversation_id)} />
          {loadingMessages ? <StateLoading label="Cargando mensajes…" /> : (
            <FlatList
              ref={listRef}
              contentContainerStyle={[styles.messageList, messages.length === 0 && styles.emptyList]}
              data={messages}
              keyExtractor={(message) => message.message_id}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.emptyText}>No hay mensajes todavía. Inicia la conversación sobre este servicio.</Text>}
              ListHeaderComponent={hasOlder ? <AppButton label="Cargar mensajes anteriores" variant="ghost" loading={loadingOlder} onPress={() => void loadOlder()} /> : null}
              onContentSizeChange={() => {
                if (scrollAfterChangeRef.current) {
                  listRef.current?.scrollToEnd({ animated: messages.length > 0 });
                  scrollAfterChangeRef.current = false;
                }
              }}
              renderItem={({ item }) => <MessageBubble message={item} />}
              showsVerticalScrollIndicator={false}
            />
          )}
          {historyFailure ? <View style={styles.historyError}><ErrorMessage>{historyFailure}</ErrorMessage><AppButton label="Sincronizar" variant="secondary" onPress={() => void reconcile(ready.conversation_id)} /></View> : null}
        </>
      ) : null}
    </Screen>
  );
}

function StateLoading({ label = 'Abriendo conversación…' }: { label?: string }) {
  return <View accessibilityRole="progressbar" style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>{label}</Text></View>;
}

function StateUnavailable() {
  return <View style={styles.state}><Text style={styles.stateTitle}>Conversación no disponible</Text><Text style={styles.muted}>No existe o no participas en la solicitud asociada.</Text><AppButton label="Volver al chat" variant="secondary" onPress={() => router.replace('/(app)/chats' as never)} /></View>;
}

function ConnectionNotice({ state, onRetry }: { state: ChatConnectionState; onRetry: () => void }) {
  if (state === 'connected') return null;
  const text = state === 'error' ? 'La actualización en tiempo real se interrumpió.' : 'Reconectando el chat…';
  return (
    <View style={styles.connection}>
      <Text style={styles.connectionText}>{text}</Text>
      {state === 'error' ? <Pressable accessibilityRole="button" onPress={onRetry}><Text style={styles.retryText}>Sincronizar</Text></Pressable> : null}
    </View>
  );
}

function MessageBubble({ message }: { message: ChatMessageView }) {
  if (message.message_type === 'system') {
    return <View style={styles.systemBubble}><Text style={styles.systemText}>{message.content}</Text><Text style={styles.systemTime}>{formatChatTime(message.created_at)}</Text></View>;
  }
  return (
    <View style={[styles.messageRow, message.is_mine ? styles.mineRow : styles.theirRow]}>
      <View style={[styles.bubble, message.is_mine ? styles.mineBubble : styles.theirBubble]}>
        <Text style={[styles.messageText, message.is_mine && styles.mineText]}>{message.content}</Text>
        <Text style={[styles.messageTime, message.is_mine && styles.mineTime]}>{formatChatTime(message.created_at)}</Text>
      </View>
    </View>
  );
}

function Composer({
  closed,
  draft,
  validation,
  sending,
  failure,
  onChange,
  onSend,
}: {
  closed: boolean;
  draft: string;
  validation: ReturnType<typeof validateMessageText>;
  sending: boolean;
  failure: string | null;
  onChange: (value: string) => void;
  onSend: () => void;
}) {
  if (closed) {
    return <View style={styles.closedComposer}><FeedbackMessage tone="info">Esta conversación está cerrada. Puedes consultar sus mensajes, pero no enviar nuevos.</FeedbackMessage></View>;
  }
  const showCounter = validation.characterCount >= CHAT_MESSAGE_COUNTER_THRESHOLD;
  return (
    <View style={styles.composerWrap}>
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
      <View style={styles.composerRow}>
        <TextInput
          accessibilityLabel="Mensaje"
          editable={!sending}
          multiline
          onChangeText={onChange}
          placeholder="Escribe un mensaje"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={draft}
        />
        <Pressable
          accessibilityLabel="Enviar mensaje"
          accessibilityRole="button"
          accessibilityState={{ disabled: !validation.ok, busy: sending }}
          disabled={!validation.ok || sending}
          onPress={onSend}
          style={({ pressed }) => [styles.sendButton, (!validation.ok || sending) && styles.sendDisabled, pressed && validation.ok && styles.sendPressed]}
        >
          {sending ? <ActivityIndicator color={colors.white} /> : <AppIcon name="send" color={colors.white} />}
        </Pressable>
      </View>
      {showCounter ? (
        <Text style={[styles.counter, validation.characterCount > CHAT_MESSAGE_MAX_CHARACTERS && styles.counterError]}>
          {validation.characterCount.toLocaleString('es-BO')} / {CHAT_MESSAGE_MAX_CHARACTERS.toLocaleString('es-BO')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: spacing.sm },
  state: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  stateTitle: { color: colors.navy, textAlign: 'center', ...typography.title },
  muted: { color: colors.textSecondary, textAlign: 'center', ...typography.body },
  connection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.warningSoft },
  connectionText: { flex: 1, color: colors.warning, ...typography.caption },
  retryText: { color: colors.primary, ...typography.label },
  messageList: { flexGrow: 1, gap: spacing.sm, paddingVertical: spacing.md },
  emptyList: { justifyContent: 'center' },
  emptyText: { color: colors.textSecondary, textAlign: 'center', padding: spacing.xl, ...typography.body },
  messageRow: { width: '100%', flexDirection: 'row' },
  mineRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '84%', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.lg },
  mineBubble: { backgroundColor: colors.primary, borderBottomRightRadius: radii.sm },
  theirBubble: { backgroundColor: colors.surfaceMuted, borderBottomLeftRadius: radii.sm },
  messageText: { color: colors.text, ...typography.body },
  mineText: { color: colors.white },
  messageTime: { color: colors.textSecondary, textAlign: 'right', ...typography.caption },
  mineTime: { color: colors.textOnDark },
  systemBubble: { alignSelf: 'center', maxWidth: '90%', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.greenSoft },
  systemText: { color: colors.success, textAlign: 'center', ...typography.caption },
  systemTime: { color: colors.textSecondary, textAlign: 'center', ...typography.caption },
  historyError: { gap: spacing.sm, paddingVertical: spacing.sm },
  composerWrap: { width: '100%', maxWidth: sizing.screenMaxWidth, alignSelf: 'center', gap: spacing.xs, paddingHorizontal: sizing.screenPadding, paddingTop: spacing.sm, backgroundColor: colors.surface },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: { flex: 1, minHeight: sizing.touchTarget, maxHeight: 132, color: colors.text, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, ...typography.body },
  sendButton: { width: sizing.buttonHeight, height: sizing.buttonHeight, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.primary },
  sendPressed: { backgroundColor: colors.primaryPressed },
  sendDisabled: { backgroundColor: colors.primaryDisabled },
  counter: { color: colors.textSecondary, textAlign: 'right', ...typography.caption },
  counterError: { color: colors.danger, fontWeight: '700' },
  closedComposer: { width: '100%', maxWidth: sizing.screenMaxWidth, alignSelf: 'center', paddingHorizontal: sizing.screenPadding, paddingTop: spacing.sm },
});

