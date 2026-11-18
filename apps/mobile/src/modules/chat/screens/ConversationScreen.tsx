import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Icon, glyphForText } from '@/components/ui/Icon';
import { Card, IconBubble, StatusPill, type StatusTone } from '@/components/ui/Kit';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage } from '@/components/ui/Typography';
import { colors, shadows, sizing, ui, uiRadii } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';
import { chatDayKey, formatChatDayLabel } from '@/modules/chat/chat-dates';
import { chatFailureMessage } from '@/modules/chat/chat-errors';
import {
  CHAT_MESSAGE_COUNTER_THRESHOLD,
  CHAT_MESSAGE_MAX_CHARACTERS,
  formatChatActivity,
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
import { serviceRequestStatusLabels } from '@/modules/service-request/service-request-model';

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
      background={<ChatBackdrop />}
      header={<ChatTopBar name={counterpart} context={ready?.service_title ?? 'Solicitud de servicio'} showAvatar={Boolean(ready)} />}
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
          <PillButton label="Reintentar" icon="refresh" onPress={() => {
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
              ListHeaderComponent={(
                <View style={styles.listHeader}>
                  {hasOlder ? <PillButton label="Cargar mensajes anteriores" variant="soft" size="sm" loading={loadingOlder} onPress={() => void loadOlder()} style={styles.olderButton} /> : null}
                  <RequestCard conversation={ready} counterpart={counterpart} />
                </View>
              )}
              onContentSizeChange={() => {
                if (scrollAfterChangeRef.current) {
                  listRef.current?.scrollToEnd({ animated: messages.length > 0 });
                  scrollAfterChangeRef.current = false;
                }
              }}
              renderItem={({ item, index }) => (
                <View style={styles.cell}>
                  {index === 0 || chatDayKey(messages[index - 1].created_at) !== chatDayKey(item.created_at)
                    ? <DaySeparator value={item.created_at} />
                    : null}
                  <MessageBubble message={item} counterpart={counterpart} />
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
          {historyFailure ? <View style={styles.historyError}><ErrorMessage>{historyFailure}</ErrorMessage><PillButton label="Sincronizar" variant="outline" icon="sync" onPress={() => void reconcile(ready.conversation_id)} /></View> : null}
        </>
      ) : null}
    </Screen>
  );
}

/** Light grey page with a white strip under the status bar so the white top bar reaches the top edge. */
function ChatBackdrop() {
  const insets = useSafeAreaInsets();
  return <View style={styles.backdrop}><View style={[styles.backdropTop, { height: insets.top }]} /></View>;
}

/** White conversation bar from the chat mockup: back arrow · ring avatar · name + service context. */
function ChatTopBar({ name, context, showAvatar }: { name: string; context: string; showAvatar: boolean }) {
  return (
    <View style={styles.topBar}>
      <StatusBar style="dark" />
      <View style={styles.topBarRow}>
        <Pressable accessibilityLabel="Volver" accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Icon color={ui.ink} name="arrow-left" size={28} />
        </Pressable>
        {showAvatar ? <Avatar name={name} size={52} /> : null}
        <View style={styles.topBarCopy}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.topBarName}>{name}</Text>
          <Text numberOfLines={1} style={styles.topBarContext}>{context}</Text>
        </View>
      </View>
    </View>
  );
}

function requestStatusTone(status: string): StatusTone {
  if (status === 'pending' || status === 'accepted') return 'success';
  if (status === 'quoted') return 'accent';
  if (status === 'rejected' || status === 'cancelled') return 'danger';
  return 'neutral';
}

/** Inline "Solicitud de servicio" card: the request this conversation belongs to. */
function RequestCard({ conversation, counterpart }: { conversation: ChatConversation; counterpart: string }) {
  const statusLabel = (serviceRequestStatusLabels as Record<string, string>)[conversation.request_status] ?? conversation.request_status;
  return (
    <Card style={styles.requestCard}>
      <View style={styles.requestTop}>
        <IconBubble name="calendar-month" variant="soft" size={60} iconSize={30} />
        <View style={styles.requestCopy}>
          <View style={styles.requestTitleRow}>
            <Text numberOfLines={1} style={styles.requestTitle}>Solicitud de servicio</Text>
            <StatusPill label={statusLabel} tone={requestStatusTone(conversation.request_status)} />
          </View>
          <View style={styles.requestRow}>
            <Icon color={ui.inkSoft} name={glyphForText(conversation.service_title)} size={18} />
            <Text style={styles.requestRowText}>{conversation.service_title}</Text>
          </View>
          <View style={styles.requestRow}>
            <Icon color={ui.inkSoft} name="account" size={18} />
            <Text style={styles.requestRowText}>{conversation.perspective === 'customer' ? 'Profesional' : 'Cliente'}: {counterpart}</Text>
          </View>
          <View style={styles.requestRow}>
            <Icon color={ui.inkSoft} name="message-text-clock" size={18} />
            <Text style={styles.requestRowText}>Chat iniciado: {formatChatActivity(conversation.created_at)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.requestDivider} />
      <Pressable
        accessibilityLabel="Ver detalles de la solicitud"
        accessibilityRole="button"
        hitSlop={6}
        onPress={() => router.push({ pathname: '/(app)/request/[requestId]', params: { requestId: conversation.service_request_id } } as never)}
        style={({ pressed }) => [styles.requestLink, pressed && styles.pressed]}
      >
        <Text style={styles.requestLinkLabel}>Ver detalles</Text>
        <Icon color={ui.accent} name="chevron-right" size={22} />
      </Pressable>
    </Card>
  );
}

function DaySeparator({ value }: { value: string }) {
  return <View style={styles.dayPill}><Text style={styles.dayLabel}>{formatChatDayLabel(value)}</Text></View>;
}

function StateLoading({ label = 'Abriendo conversación…' }: { label?: string }) {
  return <View accessibilityRole="progressbar" style={styles.state}><ActivityIndicator color={ui.accent} /><Text style={styles.muted}>{label}</Text></View>;
}

function StateUnavailable() {
  return (
    <View style={styles.state}>
      <IconBubble name="message-alert" variant="soft" size={64} />
      <Text style={styles.stateTitle}>Conversación no disponible</Text>
      <Text style={styles.muted}>No existe o no participas en la solicitud asociada.</Text>
      <PillButton label="Volver al chat" variant="outline" onPress={() => router.replace('/(app)/chats' as never)} />
    </View>
  );
}

function ConnectionNotice({ state, onRetry }: { state: ChatConnectionState; onRetry: () => void }) {
  if (state === 'connected') return null;
  const text = state === 'error' ? 'La actualización en tiempo real se interrumpió.' : 'Reconectando el chat…';
  return (
    <View style={styles.connection}>
      <Icon color={colors.warning} name="cloud-sync" size={18} />
      <Text style={styles.connectionText}>{text}</Text>
      {state === 'error' ? <Pressable accessibilityRole="button" hitSlop={8} onPress={onRetry}><Text style={styles.retryText}>Sincronizar</Text></Pressable> : null}
    </View>
  );
}

function MessageBubble({ message, counterpart }: { message: ChatMessageView; counterpart: string }) {
  if (message.message_type === 'system') {
    return <View style={styles.systemBubble}><Text style={styles.systemText}>{message.content}</Text><Text style={styles.systemTime}>{formatChatTime(message.created_at)}</Text></View>;
  }
  return (
    <View style={[styles.messageRow, message.is_mine ? styles.mineRow : styles.theirRow]}>
      {message.is_mine ? null : <Avatar name={counterpart} size={36} ring={false} />}
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
    return (
      <View style={styles.composerWrap}>
        <View accessibilityRole="text" style={styles.closedNotice}>
          <Icon color={ui.muted} name="lock" size={20} />
          <Text style={styles.closedText}>Esta conversación está cerrada. Puedes consultar sus mensajes, pero no enviar nuevos.</Text>
        </View>
      </View>
    );
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
          placeholderTextColor={ui.subtle}
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
          {sending ? <ActivityIndicator color={ui.white} /> : <Icon color={ui.white} name="send" size={24} />}
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
  screen: { flex: 1, paddingTop: 0, paddingBottom: 0 },
  pressed: { opacity: 0.7 },
  backdrop: { flex: 1, backgroundColor: ui.page },
  backdropTop: { backgroundColor: ui.card },
  topBar: { backgroundColor: ui.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ui.divider, ...shadows.card },
  topBarRow: { width: '100%', maxWidth: sizing.screenMaxWidth, alignSelf: 'center', minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 8, paddingRight: sizing.screenPadding, paddingVertical: 10 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topBarCopy: { flex: 1, gap: 2 },
  topBarName: { color: ui.ink, fontSize: 19, lineHeight: 25, fontWeight: '800' },
  topBarContext: { color: ui.muted, fontSize: 14, lineHeight: 19 },
  state: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  stateTitle: { color: ui.ink, textAlign: 'center', fontSize: 19, lineHeight: 25, fontWeight: '700' },
  muted: { color: ui.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
  connection: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: uiRadii.md, backgroundColor: colors.warningSoft },
  connectionText: { flex: 1, color: colors.warning, fontSize: 13, lineHeight: 18 },
  retryText: { color: ui.accent, fontSize: 14, fontWeight: '700' },
  messageList: { flexGrow: 1, gap: 12, paddingTop: 14, paddingBottom: 16 },
  emptyList: { justifyContent: 'center' },
  listHeader: { gap: 12 },
  cell: { gap: 12 },
  olderButton: { alignSelf: 'center' },
  emptyText: { color: ui.muted, textAlign: 'center', padding: 24, fontSize: 15, lineHeight: 21 },
  requestCard: { gap: 12, marginBottom: 4 },
  requestTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  requestCopy: { flex: 1, gap: 8 },
  requestTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  requestTitle: { flexShrink: 1, color: ui.ink, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestRowText: { flex: 1, color: ui.inkSoft, fontSize: 14, lineHeight: 19 },
  requestDivider: { height: 1, backgroundColor: ui.divider },
  requestLink: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  requestLinkLabel: { color: ui.accent, fontSize: 15, fontWeight: '600' },
  dayPill: { alignSelf: 'center', marginVertical: 4, paddingHorizontal: 14, paddingVertical: 5, borderRadius: uiRadii.pill, backgroundColor: ui.divider },
  dayLabel: { color: ui.inkSoft, fontSize: 13, lineHeight: 17, fontWeight: '500' },
  messageRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  mineRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', gap: 4, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderRadius: 18 },
  mineBubble: { backgroundColor: ui.accent, borderBottomRightRadius: 6 },
  theirBubble: { flexShrink: 1, backgroundColor: ui.divider },
  messageText: { color: ui.ink, fontSize: 16, lineHeight: 22 },
  mineText: { color: ui.white },
  messageTime: { alignSelf: 'flex-end', color: ui.muted, fontSize: 12, lineHeight: 16 },
  mineTime: { color: ui.headerMuted },
  systemBubble: { alignSelf: 'center', maxWidth: '90%', gap: 2, paddingHorizontal: 14, paddingVertical: 8, borderRadius: uiRadii.lg, backgroundColor: ui.greenSoft },
  systemText: { color: ui.greenText, textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  systemTime: { color: ui.muted, textAlign: 'center', fontSize: 12, lineHeight: 16 },
  historyError: { gap: 8, paddingVertical: 8 },
  composerWrap: { width: '100%', maxWidth: sizing.screenMaxWidth, alignSelf: 'center', gap: 6, paddingHorizontal: sizing.screenPadding, paddingTop: 12, paddingBottom: 10, backgroundColor: ui.card },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  input: { flex: 1, minHeight: 52, maxHeight: 132, color: ui.ink, borderWidth: 1, borderColor: ui.divider, borderRadius: 26, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, backgroundColor: ui.card, fontSize: 16, lineHeight: 22 },
  sendButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: ui.accent },
  sendPressed: { backgroundColor: ui.accentPressed },
  sendDisabled: { opacity: 0.45 },
  counter: { color: ui.muted, textAlign: 'right', fontSize: 12, lineHeight: 16 },
  counterError: { color: ui.danger, fontWeight: '700' },
  closedNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: uiRadii.lg, backgroundColor: ui.tag },
  closedText: { flex: 1, color: ui.inkSoft, fontSize: 14, lineHeight: 19 },
});
