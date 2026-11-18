import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Icon, appIconGlyph } from '@/components/ui/Icon';
import { Card, IconBubble } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { shadows, ui, uiRadii } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';
import { notificationFailureMessage } from '@/modules/notification/notification-errors';
import {
  formatNotificationTimestamp,
  mergeNotifications,
  newestNotificationCursor,
  notificationIcon,
  notificationRoute,
  oldestNotificationCursor,
} from '@/modules/notification/notification-model';
import { subscribeToOwnNotifications } from '@/modules/notification/notification-realtime';
import {
  getMyNotificationUnreadCount,
  listMyNotifications,
  listMyNotificationsAfter,
  markMyNotificationRead,
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_SYNC_SIZE,
} from '@/modules/notification/notification-service';
import type { AppNotification, NotificationConnectionState } from '@/modules/notification/types';

export function NotificationCenterScreen() {
  const { user } = useAuth();
  const profileId = user?.id ?? '';
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pageFailure, setPageFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [connection, setConnection] = useState<NotificationConnectionState>('connecting');
  const [markingId, setMarkingId] = useState<string | null>(null);
  const itemsRef = useRef<AppNotification[]>([]);
  const currentRef = useRef(true);
  const syncingRef = useRef(false);

  const applyItems = useCallback((incoming: AppNotification[], replace: boolean) => {
    const next = replace ? incoming : mergeNotifications(itemsRef.current, incoming);
    itemsRef.current = next;
    setItems(next);
  }, []);

  const loadFirstPage = useCallback(async (replace: boolean, showRefresh: boolean) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [page, count] = await Promise.all([
        listMyNotifications(null),
        getMyNotificationUnreadCount(),
      ]);
      if (!currentRef.current) return;
      applyItems(page, replace);
      setUnreadCount(count);
      if (replace) setHasOlder(page.length === NOTIFICATION_PAGE_SIZE);
      setFailure(null);
      setPageFailure(null);
    } catch (cause) {
      if (!currentRef.current) return;
      setFailure(notificationFailureMessage(cause));
    } finally {
      if (currentRef.current) {
        setLoading(false);
        if (showRefresh) setRefreshing(false);
      }
    }
  }, [applyItems]);

  const reconcile = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      let cursor = newestNotificationCursor(itemsRef.current);
      if (cursor) {
        let page: AppNotification[];
        do {
          page = await listMyNotificationsAfter(cursor);
          if (page.length) {
            applyItems(page, false);
            const newest = page[page.length - 1];
            cursor = { createdAt: newest.created_at, id: newest.notification_id };
          }
        } while (page.length === NOTIFICATION_SYNC_SIZE);
      }
      await loadFirstPage(false, false);
      if (currentRef.current) setConnection('connected');
    } catch (cause) {
      if (!currentRef.current) return;
      setConnection('error');
      setPageFailure(notificationFailureMessage(cause));
    } finally {
      syncingRef.current = false;
    }
  }, [applyItems, loadFirstPage]);

  useEffect(() => {
    currentRef.current = true;
    const initialLoad = setTimeout(() => { void loadFirstPage(true, false); }, 0);
    const unsubscribe = profileId
      ? subscribeToOwnNotifications(
        profileId,
        () => { void reconcile(); },
        (state) => {
          if (!currentRef.current) return;
          setConnection(state);
          if (state === 'connected') void reconcile();
        },
      )
      : () => {};
    return () => {
      clearTimeout(initialLoad);
      currentRef.current = false;
      unsubscribe();
    };
  }, [loadFirstPage, profileId, reconcile]);

  async function loadOlder() {
    if (loadingOlder) return;
    const cursor = oldestNotificationCursor(itemsRef.current);
    if (!cursor) return;
    setLoadingOlder(true);
    setPageFailure(null);
    try {
      const page = await listMyNotifications(cursor);
      if (!currentRef.current) return;
      applyItems(page, false);
      setHasOlder(page.length === NOTIFICATION_PAGE_SIZE);
    } catch (cause) {
      if (currentRef.current) setPageFailure(notificationFailureMessage(cause));
    } finally {
      if (currentRef.current) setLoadingOlder(false);
    }
  }

  async function openNotification(notification: AppNotification) {
    if (markingId) return;
    setNotice(null);
    setMarkingId(notification.notification_id);
    try {
      if (!notification.read_at) {
        const result = await markMyNotificationRead(notification.notification_id);
        applyItems([{ ...notification, read_at: result.readAt }], false);
        setUnreadCount(await getMyNotificationUnreadCount());
      }
      const target = notificationRoute(notification);
      if (target) router.push(target as never);
      else setNotice('Esta notificación no tiene un destino disponible. Su información permanece visible aquí.');
    } catch (cause) {
      setNotice(notificationFailureMessage(cause));
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <Screen
      scroll={false}
      contentStyle={styles.screen}
      header={<MarketplaceHeader
        back={() => router.back()}
        eyebrow="ACTIVIDAD"
        title="Notificaciones"
        subtitle={`${unreadCount} sin leer`}
      />}
    >
      <ConnectionNotice state={connection} onRetry={() => void reconcile()} />
      {notice ? <FeedbackMessage tone="info">{notice}</FeedbackMessage> : null}
      {loading && items.length === 0 ? (
        <Card style={styles.stateCard}>
          <View accessibilityRole="progressbar" style={styles.state}>
            <ActivityIndicator color={ui.accent} />
            <Text style={styles.muted}>Cargando notificaciones…</Text>
          </View>
        </Card>
      ) : null}
      {failure && items.length === 0 ? (
        <Card style={styles.stateCard}>
          <ErrorMessage>{failure}</ErrorMessage>
          <PillButton label="Reintentar" icon="refresh" onPress={() => void loadFirstPage(true, false)} />
        </Card>
      ) : null}
      {!loading && !failure && items.length === 0 ? (
        <Card style={styles.empty}>
          <View style={styles.emptyIcon}><IconBubble name="bell" variant="soft" size={68} /></View>
          <Text style={styles.emptyTitle}>Aún no tienes notificaciones</Text>
          <Text style={styles.muted}>Aquí aparecerán las novedades reales de tus solicitudes, trabajos y conversaciones.</Text>
        </Card>
      ) : null}
      {items.length ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={items}
          keyExtractor={(item) => item.notification_id}
          ListFooterComponent={hasOlder ? (
            <PillButton label="Cargar anteriores" variant="outline" loading={loadingOlder} onPress={() => void loadOlder()} />
          ) : null}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={ui.accent} colors={[ui.accent]} onRefresh={() => void loadFirstPage(true, true)} />}
          renderItem={({ item }) => (
            <NotificationCard
              item={item}
              loading={markingId === item.notification_id}
              onPress={() => void openNotification(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          style={styles.flatList}
        />
      ) : null}
      {pageFailure && items.length ? (
        <View style={styles.pageFailure}>
          <ErrorMessage>{pageFailure}</ErrorMessage>
          <PillButton label="Sincronizar" variant="outline" icon="sync" onPress={() => void reconcile()} />
        </View>
      ) : null}
    </Screen>
  );
}

function NotificationCard({ item, loading, onPress }: {
  item: AppNotification;
  loading: boolean;
  onPress: () => void;
}) {
  const unread = !item.read_at;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, unread && styles.unreadCard, pressed && styles.pressed]}
    >
      <IconBubble name={appIconGlyph[notificationIcon(item.notification_type)]} variant={unread ? 'soft' : 'grey'} color={unread ? ui.accent : ui.muted} size={48} />
      <View style={styles.cardCopy}>
        <View style={styles.titleRow}>
          <Text style={[styles.cardTitle, unread && styles.unreadTitle]}>{item.title}</Text>
          {unread ? <View accessibilityLabel="Sin leer" style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={[styles.time, unread && styles.unreadTime]}>{formatNotificationTimestamp(item.created_at)}</Text>
      </View>
      {loading ? <ActivityIndicator color={ui.accent} /> : <Icon name="chevron-right" color={ui.subtle} size={24} />}
    </Pressable>
  );
}

function ConnectionNotice({ state, onRetry }: {
  state: NotificationConnectionState;
  onRetry: () => void;
}) {
  if (state === 'connected') return null;
  return (
    <View style={[styles.connection, state === 'error' && styles.connectionError]}>
      <Icon color={state === 'error' ? ui.danger : ui.accent} name={state === 'error' ? 'wifi-off' : 'sync'} size={20} />
      <Text style={[styles.connectionText, state === 'error' && styles.connectionTextError]}>{state === 'error'
        ? 'La actualización en tiempo real se interrumpió.'
        : 'Sincronizando notificaciones…'}</Text>
      {state === 'error' ? <Pressable accessibilityRole="button" hitSlop={8} onPress={onRetry}><Text style={styles.retry}>Reintentar</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 12, paddingTop: 16 },
  stateCard: { flex: 1, minHeight: 240, justifyContent: 'center', gap: 14, marginBottom: 16 },
  state: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: ui.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
  empty: { minHeight: 300, justifyContent: 'center', gap: 12, marginTop: 8, padding: 24 },
  emptyIcon: { alignSelf: 'center' },
  emptyTitle: { color: ui.ink, textAlign: 'center', fontSize: 19, lineHeight: 25, fontWeight: '700' },
  flatList: { marginHorizontal: -6 },
  list: { gap: 12, paddingHorizontal: 6, paddingTop: 2, paddingBottom: 24 },
  card: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: uiRadii.xl, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: ui.card, ...shadows.card },
  unreadCard: { borderColor: ui.accentSoft, backgroundColor: ui.accentTint },
  pressed: { opacity: 0.8 },
  cardCopy: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, color: ui.inkSoft, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  unreadTitle: { color: ui.ink, fontWeight: '700' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ui.accent },
  body: { color: ui.muted, fontSize: 14, lineHeight: 20 },
  time: { color: ui.subtle, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  unreadTime: { color: ui.accent },
  connection: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: uiRadii.lg, backgroundColor: ui.accentSoft },
  connectionError: { backgroundColor: ui.dangerSoft },
  connectionText: { flex: 1, color: ui.accent, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  connectionTextError: { color: ui.danger },
  retry: { color: ui.accent, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  pageFailure: { gap: 8, paddingBottom: 12 },
});
