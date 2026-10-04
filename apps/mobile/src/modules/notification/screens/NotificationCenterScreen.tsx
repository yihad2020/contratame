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

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
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
        <View accessibilityRole="progressbar" style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Cargando notificaciones…</Text>
        </View>
      ) : null}
      {failure && items.length === 0 ? (
        <View style={styles.state}>
          <ErrorMessage>{failure}</ErrorMessage>
          <AppButton label="Reintentar" onPress={() => void loadFirstPage(true, false)} />
        </View>
      ) : null}
      {!loading && !failure && items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><AppIcon name="notifications" size={sizing.iconLg} /></View>
          <Text style={styles.emptyTitle}>Aún no tienes notificaciones</Text>
          <Text style={styles.muted}>Aquí aparecerán las novedades reales de tus solicitudes, trabajos y conversaciones.</Text>
        </View>
      ) : null}
      {items.length ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={items}
          keyExtractor={(item) => item.notification_id}
          ListFooterComponent={hasOlder ? (
            <AppButton label="Cargar anteriores" variant="ghost" loading={loadingOlder} onPress={() => void loadOlder()} />
          ) : null}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={() => void loadFirstPage(true, true)} />}
          renderItem={({ item }) => (
            <NotificationCard
              item={item}
              loading={markingId === item.notification_id}
              onPress={() => void openNotification(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : null}
      {pageFailure && items.length ? (
        <View style={styles.pageFailure}>
          <ErrorMessage>{pageFailure}</ErrorMessage>
          <AppButton label="Sincronizar" variant="secondary" onPress={() => void reconcile()} />
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
      <View style={[styles.icon, unread && styles.unreadIcon]}>
        <AppIcon name={notificationIcon(item.notification_type)} color={unread ? colors.primary : colors.textSecondary} />
      </View>
      <View style={styles.cardCopy}>
        <View style={styles.titleRow}>
          <Text style={[styles.cardTitle, unread && styles.unreadTitle]}>{item.title}</Text>
          {unread ? <View accessibilityLabel="Sin leer" style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.time}>{formatNotificationTimestamp(item.created_at)}</Text>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} /> : <AppIcon name="chevronRight" color={colors.textSecondary} size={sizing.iconSm} />}
    </Pressable>
  );
}

function ConnectionNotice({ state, onRetry }: {
  state: NotificationConnectionState;
  onRetry: () => void;
}) {
  if (state === 'connected') return null;
  return (
    <View style={styles.connection}>
      <Text style={styles.connectionText}>{state === 'error'
        ? 'La actualización en tiempo real se interrumpió.'
        : 'Sincronizando notificaciones…'}</Text>
      {state === 'error' ? <Pressable accessibilityRole="button" onPress={onRetry}><Text style={styles.retry}>Reintentar</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: spacing.md, paddingTop: spacing.md },
  state: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  muted: { color: colors.textSecondary, textAlign: 'center', ...typography.body },
  empty: { minHeight: 300, justifyContent: 'center', gap: spacing.md, marginTop: spacing.lg, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  emptyIcon: { width: 58, height: 58, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.primarySoft },
  emptyTitle: { color: colors.navy, textAlign: 'center', ...typography.title },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  card: { minHeight: 100, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  unreadCard: { borderColor: colors.primaryDisabled, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.74 },
  icon: { width: sizing.touchTarget, height: sizing.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  unreadIcon: { backgroundColor: colors.surface },
  cardCopy: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { flex: 1, color: colors.text, ...typography.bodyStrong },
  unreadTitle: { color: colors.navy },
  unreadDot: { width: 9, height: 9, borderRadius: radii.pill, backgroundColor: colors.primary },
  body: { color: colors.textSecondary, ...typography.body },
  time: { color: colors.primary, ...typography.caption, fontWeight: '600' },
  connection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.warningSoft },
  connectionText: { flex: 1, color: colors.warning, ...typography.caption },
  retry: { color: colors.primary, ...typography.label },
  pageFailure: { gap: spacing.sm, paddingBottom: spacing.md },
});
