import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
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
        <View accessibilityRole="progressbar" style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Cargando tus favoritos…</Text>
        </View>
      ) : null}
      {!loading && failure ? (
        <View style={styles.state}>
          <ErrorMessage>{failure}</ErrorMessage>
          <AppButton label="Reintentar" onPress={() => void loadFirstPage()} />
        </View>
      ) : null}
      {!loading && !failure && items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><AppIcon name="heart" size={sizing.iconLg} /></View>
          <Text style={styles.emptyTitle}>Aún no guardaste profesionales</Text>
          <Text style={styles.muted}>Abre un perfil público y toca “Agregar a favoritos”.</Text>
          <AppButton label="Explorar profesionales" onPress={() => router.replace('/(app)/explore' as never)} />
        </View>
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
      {hasMore && !failure ? <AppButton label="Cargar más" variant="secondary" loading={loadingMore} onPress={() => void loadMore()} /> : null}
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
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.cardIcon}><AppIcon name="briefcase" color={colors.textSecondary} /></View>
          <View style={styles.copy}>
            <Text style={styles.cardTitle}>Profesional no disponible</Text>
            <Text style={styles.muted}>El perfil dejó de ser público. No mostramos información privada.</Text>
          </View>
        </View>
        <AppButton icon="trash" label="Quitar de favoritos" variant="ghost" loading={removing} onPress={onRemove} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.cardIcon}><AppIcon name="heart" color={colors.primary} /></View>
        <View style={styles.copy}>
          <Text style={styles.cardTitle}>{item.display_name}</Text>
          {item.category_name || item.service_title ? <Text style={styles.category}>{item.category_name ?? item.service_title}</Text> : null}
          <Text style={styles.muted}>{item.public_area_label}, {item.city}</Text>
        </View>
        <AppIcon name="chevronRight" color={colors.textSecondary} size={sizing.iconSm} />
      </Pressable>
      <AppButton icon="trash" label="Quitar de favoritos" variant="ghost" loading={removing} onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md, paddingTop: spacing.xl },
  state: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  empty: { minHeight: 280, justifyContent: 'center', gap: spacing.md, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  emptyIcon: { width: 58, height: 58, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.primarySoft },
  emptyTitle: { color: colors.navy, textAlign: 'center', ...typography.title },
  muted: { color: colors.textSecondary, ...typography.body },
  card: { gap: spacing.sm, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  row: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radii.md },
  pressed: { opacity: 0.72 },
  cardIcon: { width: sizing.touchTarget, height: sizing.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.primarySoft },
  copy: { flex: 1, gap: spacing.xs },
  cardTitle: { color: colors.text, ...typography.bodyStrong },
  category: { color: colors.primary, ...typography.label },
});
