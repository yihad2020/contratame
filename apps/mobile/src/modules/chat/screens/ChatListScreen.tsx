import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
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
          <View style={styles.emptyIcon}><AppIcon name="chat" size={sizing.iconLg} /></View>
          <Text style={styles.emptyTitle}>Aún no tienes conversaciones</Text>
          <Text style={styles.muted}>El chat aparece cuando envías o recibes una solicitud directa de servicio.</Text>
          <AppButton label="Ver solicitudes" variant="secondary" onPress={() => router.push('/(app)/requests' as never)} />
        </View>
      ) : null}
      <View style={styles.list}>
        {items.map((item) => <ConversationCard key={item.conversation_id} item={item} />)}
      </View>
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

function ConversationCard({ item }: { item: ChatConversationListItem }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/(app)/chat/[conversationId]', params: { conversationId: item.conversation_id } } as never)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatar}><AppIcon name="account" color={colors.primary} /></View>
        <View style={styles.cardCopy}>
          <Text style={styles.name}>{item.counterpart_display_name}</Text>
          <Text style={styles.service}>{item.service_title}</Text>
        </View>
        <StatusBadge label={item.conversation_status === 'active' ? 'Activa' : 'Cerrada'} tone={item.conversation_status === 'active' ? 'success' : 'danger'} />
      </View>
      <Text numberOfLines={2} style={styles.preview}>{messagePreview(item)}</Text>
      <View style={styles.cardBottom}>
        <Text style={styles.time}>{formatChatActivity(item.activity_at)}</Text>
        <View style={styles.open}><Text style={styles.openLabel}>Abrir</Text><AppIcon name="chevronRight" size={sizing.iconSm} /></View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  state: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  empty: { minHeight: 260, justifyContent: 'center', gap: spacing.md, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  emptyIcon: { width: 58, height: 58, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.primarySoft },
  emptyTitle: { color: colors.navy, textAlign: 'center', ...typography.title },
  muted: { color: colors.textSecondary, textAlign: 'center', ...typography.body },
  list: { gap: spacing.md },
  feedback: { gap: spacing.md },
  card: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  pressed: { opacity: 0.76 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: sizing.touchTarget, height: sizing.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.primarySoft },
  cardCopy: { flex: 1, gap: spacing.xs },
  name: { color: colors.navy, ...typography.section },
  service: { color: colors.primary, ...typography.caption, fontWeight: '700' },
  preview: { color: colors.text, ...typography.body },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  time: { flex: 1, color: colors.textSecondary, ...typography.caption },
  open: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  openLabel: { color: colors.primary, ...typography.label },
});

