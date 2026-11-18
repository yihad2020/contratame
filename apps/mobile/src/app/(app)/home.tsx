import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Card, CategoryTile, IconBubble, SectionTitle } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage } from '@/components/ui/Typography';
import { shadows, sizing, ui, uiRadii } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';
import { MarketplaceResultCard } from '@/modules/marketplace/components/MarketplaceResultCard';
import { marketplaceFailureMessage } from '@/modules/marketplace/marketplace-errors';
import { loadMarketplaceCategories, searchMarketplace } from '@/modules/marketplace/marketplace-service';
import type { MarketplaceCategory, MarketplaceResult } from '@/modules/marketplace/types';
import { emptyMarketplaceDraft, validateMarketplaceFilters } from '@/modules/marketplace/validation';
import { getMyNotificationUnreadCount } from '@/modules/notification/notification-service';
import type { WorkerProfile } from '@/modules/worker/types';
import { workerFailureMessage } from '@/modules/worker/worker-errors';
import { getWorkerCardCopy } from '@/modules/worker/validation';
import { getOwnWorkerProfile, startOrResumeWorkerOnboarding } from '@/modules/worker/worker-service';

const HOME_CATEGORY_COUNT = 5;
const HOME_FEATURED_COUNT = 2;
const TILE_GAP = 8;
const TILE_MIN_WIDTH = 72;

const openExplore = () => router.push('/(app)/explore' as never);
// Same default (unfiltered) search ExploreScreen starts with.
const featuredFilters = validateMarketplaceFilters(emptyMarketplaceDraft);

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const { width } = useWindowDimensions();
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [workerLoading, setWorkerLoading] = useState(true);
  const [workerLoadError, setWorkerLoadError] = useState<string | null>(null);
  const [startingWorker, setStartingWorker] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesFailure, setCategoriesFailure] = useState<string | null>(null);
  const [featured, setFeatured] = useState<MarketplaceResult[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(featuredFilters.ok);
  const [featuredFailure, setFeaturedFailure] = useState<string | null>(null);
  const startingWorkerRef = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setWorkerLoading(true);
    setWorkerLoadError(null);
    void getOwnWorkerProfile()
      .then((result) => { if (active) setWorker(result); })
      .catch((cause) => { if (active) setWorkerLoadError(workerFailureMessage(cause, 'No se pudo consultar tu perfil profesional. Toca la tarjeta para reintentar.', 'load worker status')); })
      .finally(() => { if (active) setWorkerLoading(false); });
    void getMyNotificationUnreadCount()
      .then((count) => { if (active) setUnreadNotifications(count); })
      .catch(() => { if (active) setUnreadNotifications(null); });
    return () => { active = false; };
  }, []));

  // Read-only marketplace previews: same public category list and default search Explore uses.
  useEffect(() => {
    let active = true;
    void loadMarketplaceCategories()
      .then((rows) => { if (active) setCategories(rows.slice(0, HOME_CATEGORY_COUNT)); })
      .catch((cause) => { if (active) setCategoriesFailure(marketplaceFailureMessage(cause, 'No pudimos cargar las categorías.', 'home categories')); })
      .finally(() => { if (active) setCategoriesLoading(false); });
    if (featuredFilters.ok) {
      void searchMarketplace(featuredFilters.value, 0, HOME_FEATURED_COUNT)
        .then((rows) => { if (active) setFeatured(rows.slice(0, HOME_FEATURED_COUNT)); })
        .catch((cause) => { if (active) setFeaturedFailure(marketplaceFailureMessage(cause, 'No pudimos cargar profesionales.', 'home featured workers')); })
        .finally(() => { if (active) setFeaturedLoading(false); });
    }
    return () => { active = false; };
  }, []);

  const workerCopy = getWorkerCardCopy(worker?.approval_status ?? null);
  const contentWidth = Math.max(0, Math.min(width, sizing.screenMaxWidth) - sizing.screenPadding * 2);
  const tileWidth = Math.max(TILE_MIN_WIDTH, (contentWidth - TILE_GAP * (HOME_CATEGORY_COUNT - 1)) / HOME_CATEGORY_COUNT);
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : user?.email ?? null;

  async function openWorkerProfile() {
    if (startingWorkerRef.current || workerLoading) return;
    startingWorkerRef.current = true;
    setStartingWorker(true);
    try {
      const current = await startOrResumeWorkerOnboarding();
      setWorker(current);
      setWorkerLoadError(null);
      router.push('/(app)/worker-onboarding' as never);
    } catch (cause) {
      const message = workerFailureMessage(cause, 'Inténtalo nuevamente.', 'start or resume worker');
      setWorkerLoadError(message);
      Alert.alert('No pudimos abrir tu perfil', message);
    } finally { startingWorkerRef.current = false; setStartingWorker(false); }
  }

  const workerTitle = workerLoadError ? 'Reintentar perfil profesional' : workerCopy.title;
  const workerDescription = startingWorker ? 'Preparando tu perfil…' : workerLoading ? 'Cargando tu estado profesional…' : workerLoadError ?? workerCopy.description;

  return (
    <Screen contentStyle={styles.screen} footer={<MarketplaceNav active="home" />} header={<MarketplaceHeader
        action={{
          label: 'Abrir notificaciones',
          icon: 'notifications',
          badgeCount: unreadNotifications,
          onPress: () => router.push('/(app)/notifications' as never),
        }}
        brand
      >
        <View style={styles.greeting}>
          <Avatar badge="online" name={fullName} size={64} />
          <View style={styles.greetingCopy}>
            <Text accessibilityRole="header" numberOfLines={1} style={styles.hello}>Hola, {profile?.first_name ?? 'bienvenido'} 👋</Text>
            <Text numberOfLines={1} style={styles.helloSub}>¿Qué quieres hacer hoy?</Text>
          </View>
        </View>
        <Pressable
          accessibilityHint="Abre Explorar para buscar profesionales y usar filtros"
          accessibilityLabel="¿Qué servicio necesitas? Buscar servicios"
          accessibilityRole="search"
          onPress={openExplore}
          style={({ pressed }) => [styles.search, pressed && styles.pressed]}
        >
          <Icon color={ui.ink} name="magnify" size={28} />
          <Text numberOfLines={1} style={styles.searchPlaceholder}>¿Qué servicio necesitas?</Text>
          <View style={styles.filterButton}>
            <Icon color={ui.white} name="tune-variant" size={24} />
          </View>
        </Pressable>
        <View style={styles.quickRow}>
          <QuickAction icon="file-document-edit" onPress={() => router.push('/(app)/requests' as never)} subtitle="Sigue tus pedidos" title="Mis solicitudes" />
          <QuickAction icon="account-group" onPress={openExplore} subtitle="Encuentra profesionales" title="Explorar oficios" />
        </View>
      </MarketplaceHeader>}>
      <View style={styles.section}>
        <SectionTitle actionLabel="Ver todas" onAction={openExplore} title="Categorías" />
        {categoriesLoading ? <ActivityIndicator color={ui.accent} style={styles.loader} /> : null}
        {!categoriesLoading && categoriesFailure ? <Text style={styles.quiet}>{categoriesFailure}</Text> : null}
        {!categoriesLoading && !categoriesFailure && categories.length === 0 ? <Text style={styles.quiet}>Aún no hay categorías disponibles.</Text> : null}
        {categories.length > 0 ? (
          <ScrollView
            contentContainerStyle={styles.tilesContent}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tiles}
          >
            {categories.map((category) => (
              <CategoryTile key={category.id} iconKey={category.icon_key} label={category.name} onPress={openExplore} slug={category.slug} width={tileWidth} />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionTitle actionLabel="Ver todas" onAction={openExplore} title="Trabajadores destacados" />
        {featuredLoading ? <ActivityIndicator color={ui.accent} style={styles.loader} /> : null}
        {!featuredLoading && featuredFailure ? <Text style={styles.quiet}>{featuredFailure}</Text> : null}
        {!featuredLoading && !featuredFailure && featured.length === 0 ? <Text style={styles.quiet}>Aún no hay profesionales publicados.</Text> : null}
        {featured.map((result) => (
          <MarketplaceResultCard
            key={result.worker_id}
            onOpen={() => router.push({ pathname: '/(app)/worker/[workerId]', params: { workerId: result.worker_id } } as never)}
            result={result}
          />
        ))}
      </View>

      <View style={styles.section}>
        <SectionTitle title="Trabaja en Contrátame!" />
        <Card accessibilityLabel={`${workerTitle}. ${workerDescription}`} onPress={() => void openWorkerProfile()} style={styles.rowCard}>
          <IconBubble name="hammer-wrench" size={52} />
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{workerTitle}</Text>
            <Text style={styles.rowMeta}>{workerDescription}</Text>
          </View>
          {startingWorker || workerLoading ? <ActivityIndicator color={ui.accent} /> : <Icon color={ui.muted} name="chevron-right" size={26} />}
        </Card>
        {workerLoadError ? <ErrorMessage>{workerLoadError}</ErrorMessage> : null}
      </View>

      <View style={styles.section}>
        <SectionTitle actionLabel="Editar" onAction={() => router.push('/(app)/profile')} title="Tu perfil" />
        <Card style={styles.rowCard}>
          <Avatar name={fullName} size={52} />
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{profile ? profile.first_name + ' ' + profile.last_name : 'Cuenta Contrátame!'}</Text>
            <Text numberOfLines={1} style={styles.rowMeta}>{user?.email}</Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

function QuickAction({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityHint={subtitle}
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quick, pressed && styles.pressed]}
    >
      <IconBubble name={icon} size={44} />
      <View style={styles.quickCopy}>
        <Text numberOfLines={2} style={styles.quickTitle}>{title}</Text>
        <Text numberOfLines={2} style={styles.quickSub}>{subtitle}</Text>
      </View>
      <Icon color={ui.ink} name="chevron-right" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 24, paddingTop: 20 },
  pressed: { opacity: 0.85 },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  greetingCopy: { flex: 1, gap: 4 },
  hello: { color: ui.headerText, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  helloSub: { color: ui.headerMuted, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  search: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 18,
    paddingRight: 6,
    borderRadius: uiRadii.pill,
    backgroundColor: ui.card,
    ...shadows.card,
  },
  searchPlaceholder: { flex: 1, color: ui.muted, fontSize: 16, lineHeight: 22 },
  filterButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.accent },
  quickRow: { flexDirection: 'row', gap: 12 },
  quick: {
    flex: 1,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 12,
    borderRadius: uiRadii.xl,
    backgroundColor: ui.card,
    ...shadows.card,
  },
  quickCopy: { flex: 1, gap: 2 },
  quickTitle: { color: ui.ink, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  quickSub: { color: ui.muted, fontSize: 12, lineHeight: 15 },
  section: { gap: 12 },
  loader: { paddingVertical: 12 },
  quiet: { color: ui.muted, fontSize: 14, lineHeight: 20 },
  tiles: { flexGrow: 0, marginHorizontal: -sizing.screenPadding },
  tilesContent: { gap: TILE_GAP, paddingHorizontal: sizing.screenPadding, paddingTop: 2, paddingBottom: 8 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { color: ui.ink, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  rowMeta: { color: ui.muted, fontSize: 14, lineHeight: 19 },
});
