import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { chatFailureMessage } from '@/modules/chat/chat-errors';
import {
  formatChatActivity,
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
      header={<MarketplaceHeader brand title="Chat" subtitle="Conversaciones vinculadas a tus solicitudes reales." />}
    >
      {loading && items.length === 0 ? (
        <View accessibilityRole="progressbar" style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Cargando conversaciones…</Text>
        </View>
      ) : null}
      {failure ? (
        <View style={styles.state}>
          <ErrorMessage>{failure}</ErrorMessage>
          <AppButton label="Reintentar" onPress={() => void load(true)} />
        </View>
      ) : null}
      {!loading && !failure && items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><AppIcon name="chat" color={colors.primary} size={sizing.iconLg} /></View>
          <Text style={styles.emptyTitle}>Aún no tienes conversaciones</Text>
          <Text style={styles.muted}>El chat aparece cuando envías o recibes una solicitud directa de servicio.</Text>
          <AppButton label="Ver solicitudes" variant="secondary" onPress={() => router.push('/(app)/requests' as never)} />
        </View>
      ) : null}
      {items.length > 0 ? (
        <View style={styles.list}>
          {items.map((item, index) => <ConversationRow key={item.conversation_id} item={item} first={index === 0} />)}
        </View>
      ) : null}
      {pageFailure ? (
        <View style={styles.feedback}>
          <ErrorMessage>{pageFailure}</ErrorMessage>
          <AppButton label="Reintentar página" variant="secondary" onPress={() => void load(false, nextConversationCursor(items))} />
        </View>
      ) : null}
      {hasMore ? <AppButton label="Cargar más" variant="secondary" loading={loadingPage} onPress={() => void load(false, nextConversationCursor(items))} /> : null}
    </Screen>
  );
}

function ConversationRow({ item, first }: { item: ChatConversationListItem; first: boolean }) {
  const active = item.conversation_status === 'active';
  const initials = item.counterpart_display_name.split(/\s+/).map((part) => part[0] ?? '').join('').slice(0, 2).toUpperCase();
  return (
    <PressableScale
      accessibilityHint="Abre la conversación"
      accessibilityLabel={`${item.counterpart_display_name}, ${item.service_title}, ${active ? 'activa' : 'cerrada'}`}
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/(app)/chat/[conversationId]', params: { conversationId: item.conversation_id } } as never)}
      pressedScale={0.985}
      style={[styles.row, !first && styles.rowDivider]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
        {active ? <View style={styles.activeDot} /> : null}
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}>
          <Text numberOfLines={1} style={styles.name}>{item.counterpart_display_name}</Text>
          <Text style={styles.time}>{formatChatActivity(item.activity_at)}</Text>
        </View>
        <Text numberOfLines={1} style={styles.service}>{item.service_title}{active ? '' : ' · Cerrada'}</Text>
        <Text numberOfLines={1} style={styles.preview}>{messagePreview(item)}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  state: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  empty: { minHeight: 260, justifyContent: 'center', gap: spacing.md, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xxl, backgroundColor: colors.surface },
  emptyIcon: { width: 56, height: 56, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: radii.xl, backgroundColor: colors.primarySoft },
  emptyTitle: { color: colors.navy, textAlign: 'center', ...typography.title, letterSpacing: -0.4 },
  muted: { color: colors.textSecondary, textAlign: 'center', ...typography.body },
  list: { borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  feedback: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 80, backgroundColor: colors.surface },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  avatar: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: colors.primarySoft },
  avatarText: { color: colors.primary, fontSize: 17, lineHeight: 22, fontWeight: '800', letterSpacing: -0.3 },
  activeDot: { position: 'absolute', right: -3, bottom: -3, width: 14, height: 14, borderRadius: radii.pill, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.surface },
  rowCopy: { flex: 1, gap: spacing.xxs },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  name: { flex: 1, color: colors.navy, ...typography.bodyStrong, letterSpacing: -0.2 },
  time: { color: colors.textSecondary, fontSize: 12, lineHeight: 16 },
  service: { color: colors.primary, ...typography.caption, fontWeight: '700' },
  preview: { color: colors.textSecondary, ...typography.caption },
});
