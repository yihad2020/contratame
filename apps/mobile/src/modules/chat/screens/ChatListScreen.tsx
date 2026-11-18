import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Card, IconBubble, StatusPill } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage } from '@/components/ui/Typography';
import { ui } from '@/constants/theme';
import { formatChatListTime } from '@/modules/chat/chat-dates';
import { chatFailureMessage } from '@/modules/chat/chat-errors';
import {
  mergeConversationPages,
  messagePreview,
  nextConversationCursor,
} from '@/modules/chat/chat-model';
import { CHAT_LIST_PAGE_SIZE, listMyConversations } from '@/modules/chat/chat-service';
import type { ChatConversationListItem } from '@/modules/chat/types';

export function ChatListScreen() {
  const [items, setItems] = useState<ChatConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pageFailure, setPageFailure] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (reset: boolean, cursor = null as ReturnType<typeof nextConversationCursor>) => {
    const request = ++requestRef.current;
    if (reset) { setLoading(true); setFailure(null); }
    else { setLoadingPage(true); setPageFailure(null); }
    try {
      const page = await listMyConversations(reset ? null : cursor);
      if (request !== requestRef.current) return;
      setItems((current) => reset ? page : mergeConversationPages(current, page));
      setHasMore(page.length === CHAT_LIST_PAGE_SIZE);
    } catch (cause) {
      if (request !== requestRef.current) return;
      const message = chatFailureMessage(cause);
      if (reset) setFailure(message); else setPageFailure(message);
    } finally {
      if (request === requestRef.current) {
        if (reset) setLoading(false); else setLoadingPage(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load(true);
    return () => { requestRef.current += 1; };
  }, [load]));


  return (
    <Screen
      contentStyle={styles.screen}
      footer={<MarketplaceNav active="chat" />}
      header={<MarketplaceHeader brand title="Mensajes" subtitle="Conversaciones vinculadas a tus solicitudes reales." />}
    >
      {loading && items.length === 0 ? (
        <View accessibilityRole="progressbar" style={styles.state}>
          <ActivityIndicator color={ui.accent} />
          <Text style={styles.muted}>Cargando conversaciones…</Text>
        </View>
      ) : null}
      {failure ? (
        <View style={styles.state}>
          <ErrorMessage>{failure}</ErrorMessage>
          <PillButton label="Reintentar" icon="refresh" onPress={() => void load(true)} />
        </View>
      ) : null}
      {!loading && !failure && items.length === 0 ? (
        <Card style={styles.empty}>
          <View style={styles.emptyIcon}><IconBubble name="message-processing" variant="soft" size={64} /></View>
          <Text style={styles.emptyTitle}>Aún no tienes conversaciones</Text>
          <Text style={styles.muted}>El chat aparece cuando envías o recibes una solicitud directa de servicio.</Text>
          <PillButton label="Ver solicitudes" variant="outline" chevron onPress={() => router.push('/(app)/requests' as never)} style={styles.emptyAction} />
        </Card>
      ) : null}
      <View style={styles.list}>
        {items.map((item) => <ConversationCard key={item.conversation_id} item={item} />)}
      </View>
      {pageFailure ? (
        <View style={styles.feedback}>
          <ErrorMessage>{pageFailure}</ErrorMessage>
          <PillButton label="Reintentar página" variant="outline" onPress={() => void load(false, nextConversationCursor(items))} />
        </View>
      ) : null}
      {hasMore ? <PillButton label="Cargar más" variant="soft" loading={loadingPage} onPress={() => void load(false, nextConversationCursor(items))} /> : null}
    </Screen>
  );
}

function ConversationCard({ item }: { item: ChatConversationListItem }) {
  const active = item.conversation_status === 'active';
  return (
    <Card
      onPress={() => router.push({ pathname: '/(app)/chat/[conversationId]', params: { conversationId: item.conversation_id } } as never)}
      style={styles.card}
    >
      <Avatar name={item.counterpart_display_name} size={56} />
      <View style={styles.cardCopy}>
        <View style={styles.cardTopRow}>
          <Text numberOfLines={1} style={styles.name}>{item.counterpart_display_name}</Text>
          <Text style={styles.time}>{formatChatListTime(item.activity_at)}</Text>
        </View>
        <View style={styles.cardMidRow}>
          <Text numberOfLines={1} style={styles.service}>{item.service_title}</Text>
          <StatusPill label={active ? 'Activa' : 'Cerrada'} tone={active ? 'success' : 'danger'} dot />
        </View>
        <Text numberOfLines={2} style={styles.preview}>{messagePreview(item)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16, paddingTop: 20 },
  state: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  empty: { minHeight: 260, justifyContent: 'center', gap: 12, padding: 24 },
  emptyIcon: { alignSelf: 'center' },
  emptyTitle: { color: ui.ink, textAlign: 'center', fontSize: 19, lineHeight: 25, fontWeight: '700' },
  emptyAction: { alignSelf: 'center' },
  muted: { color: ui.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
  list: { gap: 12 },
  feedback: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  cardCopy: { flex: 1, gap: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, color: ui.ink, fontSize: 17, lineHeight: 23, fontWeight: '700' },
  time: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  cardMidRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  service: { flex: 1, color: ui.accent, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  preview: { color: ui.muted, fontSize: 15, lineHeight: 21 },
});
