import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Card, IconBubble } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { ui, uiRadii } from '@/constants/theme';
import { favoriteFailureMessage } from '@/modules/favorite/favorite-errors';
import {
  mergeFavoritePages,
  oldestFavoriteCursor,
  removeFavoriteLocally,
} from '@/modules/favorite/favorite-model';
import {
  FAVORITE_PAGE_SIZE,
  listMyWorkerFavorites,
  removeWorkerFavorite,
} from '@/modules/favorite/favorite-service';
import type { FavoriteListItem } from '@/modules/favorite/types';

export function FavoritesScreen() {
  const [items, setItems] = useState<FavoriteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const currentRef = useRef(true);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      const page = await listMyWorkerFavorites(null);
      if (!currentRef.current) return;
      setItems(page);
      setHasMore(page.length === FAVORITE_PAGE_SIZE);
    } catch (cause) {
      if (currentRef.current) setFailure(favoriteFailureMessage(cause));
    } finally {
      if (currentRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    currentRef.current = true;
    const initialLoad = setTimeout(() => { void loadFirstPage(); }, 0);
    return () => {
      clearTimeout(initialLoad);
      currentRef.current = false;
    };
  }, [loadFirstPage]);

  async function loadMore() {
    if (loadingMore) return;
    const cursor = oldestFavoriteCursor(items);
    if (!cursor) return;
    setLoadingMore(true);
    setNotice(null);
    try {
      const page = await listMyWorkerFavorites(cursor);
      if (!currentRef.current) return;
      setItems((current) => mergeFavoritePages(current, page));
      setHasMore(page.length === FAVORITE_PAGE_SIZE);
    } catch (cause) {
      if (currentRef.current) setNotice(favoriteFailureMessage(cause));
    } finally {
      if (currentRef.current) setLoadingMore(false);
    }
  }

  async function remove(item: FavoriteListItem) {
    if (removingId) return;
    setRemovingId(item.worker_id);
    setNotice(null);
    try {
      await removeWorkerFavorite(item.worker_id);
      setItems((current) => removeFavoriteLocally(current, item.worker_id));
      setNotice('El profesional se eliminó de tus favoritos.');
    } catch (cause) {
      setNotice(favoriteFailureMessage(cause));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Screen
      contentStyle={styles.screen}
      footer={<MarketplaceNav active="profile" />}
      header={<MarketplaceHeader back={() => router.back()} eyebrow="TU LISTA" title="Favoritos" subtitle="Profesionales que guardaste para después." />}
    >
      {notice ? <FeedbackMessage tone={notice.includes('eliminó') ? 'success' : 'info'}>{notice}</FeedbackMessage> : null}
      {loading ? (
        <Card style={styles.stateCard}>
          <View accessibilityRole="progressbar" style={styles.state}>
            <ActivityIndicator color={ui.accent} />
            <Text style={[styles.muted, styles.center]}>Cargando tus favoritos…</Text>
          </View>
        </Card>
      ) : null}
      {!loading && failure ? (
        <Card style={styles.stateCard}>
          <ErrorMessage>{failure}</ErrorMessage>
          <PillButton label="Reintentar" icon="refresh" onPress={() => void loadFirstPage()} />
        </Card>
      ) : null}
      {!loading && !failure && items.length === 0 ? (
        <Card style={styles.empty}>
          <View style={styles.emptyIcon}><IconBubble name="heart" variant="soft" size={68} /></View>
          <Text style={styles.emptyTitle}>Aún no guardaste profesionales</Text>
          <Text style={[styles.muted, styles.center]}>Abre un perfil público y toca “Agregar a favoritos”.</Text>
          <PillButton label="Explorar profesionales" icon="magnify" onPress={() => router.replace('/(app)/explore' as never)} />
        </Card>
      ) : null}
      {!failure ? items.map((item) => (
        <FavoriteCard
          item={item}
          key={item.worker_id}
          removing={removingId === item.worker_id}
          onOpen={() => router.push({ pathname: '/(app)/worker/[workerId]', params: { workerId: item.worker_id } } as never)}
          onRemove={() => void remove(item)}
        />
      )) : null}
      {hasMore && !failure ? <PillButton label="Cargar más" variant="outline" loading={loadingMore} onPress={() => void loadMore()} /> : null}
    </Screen>
  );
}

function FavoriteCard({ item, removing, onOpen, onRemove }: {
  item: FavoriteListItem;
  removing: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  if (!item.available) {
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <IconBubble name="account-off" variant="grey" color={ui.muted} size={56} />
          <View style={styles.copy}>
            <Text style={styles.cardTitle}>Profesional no disponible</Text>
            <Text style={styles.muted}>El perfil dejó de ser público. No mostramos información privada.</Text>
          </View>
        </View>
        <PillButton icon="heart-off" label="Quitar de favoritos" size="sm" variant="outline" loading={removing} onPress={onRemove} />
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <Avatar name={item.display_name} size={60} />
        <View style={styles.copy}>
          <Text style={styles.cardTitle}>{item.display_name}</Text>
          {item.category_name || item.service_title ? <Text style={styles.category}>{item.category_name ?? item.service_title}</Text> : null}
          <View style={styles.metaRow}>
            <Icon color={ui.muted} name="map-marker" size={18} />
            <Text style={[styles.muted, styles.flex]}>{item.public_area_label}, {item.city}</Text>
          </View>
        </View>
        <Icon name="chevron-right" color={ui.accent} size={26} />
      </Pressable>
      <View style={styles.divider} />
      <View style={styles.footerRow}>
        <View style={styles.savedTag}>
          <Icon color={ui.accent} name="heart" size={18} />
          <Text style={styles.savedLabel}>Guardado</Text>
        </View>
        <PillButton icon="heart-off" label="Quitar de favoritos" size="sm" variant="outline" loading={removing} onPress={onRemove} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14, paddingTop: 20 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  stateCard: { minHeight: 240, justifyContent: 'center', gap: 14 },
  state: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  empty: { minHeight: 280, justifyContent: 'center', gap: 12, padding: 24 },
  emptyIcon: { alignSelf: 'center' },
  emptyTitle: { color: ui.ink, textAlign: 'center', fontSize: 19, lineHeight: 25, fontWeight: '700' },
  muted: { color: ui.muted, fontSize: 14, lineHeight: 20 },
  card: { gap: 12 },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: uiRadii.md },
  pressed: { opacity: 0.75 },
  copy: { flex: 1, gap: 3 },
  cardTitle: { color: ui.ink, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  category: { color: ui.inkSoft, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: { height: 1, backgroundColor: ui.divider },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  savedTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: uiRadii.pill, backgroundColor: ui.accentSoft },
  savedLabel: { color: ui.accent, fontSize: 13, lineHeight: 18, fontWeight: '600' },
});
