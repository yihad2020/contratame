import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';
import { CategoryGrid } from '@/modules/home/components/CategoryGrid';
import { HomeHero } from '@/modules/home/components/HomeHero';
import { HomeSearchBar } from '@/modules/home/components/HomeSearchBar';
import { WorkerStatusPanel } from '@/modules/home/components/WorkerStatusPanel';
import { WorkModeContent } from '@/modules/home/components/WorkModeContent';
import {
  HOME_FEATURED_LIMIT,
  buildExploreSearchParams,
  getGreeting,
  getWorkerPanel,
  type HomeMode,
} from '@/modules/home/home-model';
import { MarketplaceResultCard } from '@/modules/marketplace/components/MarketplaceResultCard';
import { marketplaceFailureMessage } from '@/modules/marketplace/marketplace-errors';
import { loadMarketplaceCategories, searchMarketplace } from '@/modules/marketplace/marketplace-service';
import type { MarketplaceCategory, MarketplaceResult } from '@/modules/marketplace/types';
import { emptyMarketplaceDraft, validateMarketplaceFilters } from '@/modules/marketplace/validation';
import { getMyNotificationUnreadCount } from '@/modules/notification/notification-service';
import type { WorkerProfile } from '@/modules/worker/types';
import { workerFailureMessage } from '@/modules/worker/worker-errors';
import { getOwnWorkerProfile, startOrResumeWorkerOnboarding } from '@/modules/worker/worker-service';

const defaultFilterCheck = validateMarketplaceFilters(emptyMarketplaceDraft);
if (!defaultFilterCheck.ok) throw new Error('Invalid default marketplace filters');
const defaultFilters = defaultFilterCheck.value;

export default function HomeScreen() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<HomeMode>('hire');

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [workerLoading, setWorkerLoading] = useState(true);
  const [workerLoadError, setWorkerLoadError] = useState<string | null>(null);
  const [startingWorker, setStartingWorker] = useState(false);
  const startingWorkerRef = useRef(false);
  const workerRequestRef = useRef(0);

  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [featured, setFeatured] = useState<MarketplaceResult[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState<string | null>(null);

  const loadWorker = useCallback(() => {
    const request = ++workerRequestRef.current;
    setWorkerLoading(true);
    setWorkerLoadError(null);
    void getOwnWorkerProfile()
      .then((result) => { if (request === workerRequestRef.current) setWorker(result); })
      .catch((cause) => {
        if (request === workerRequestRef.current) {
          setWorkerLoadError(workerFailureMessage(cause, 'Revisa tu conexión e inténtalo nuevamente.', 'load worker status'));
        }
      })
      .finally(() => { if (request === workerRequestRef.current) setWorkerLoading(false); });
  }, []);

  const fetchCategories = useCallback(() => loadMarketplaceCategories()
    .then(setCategories)
    .catch((cause) => setCategoriesError(marketplaceFailureMessage(cause, 'No pudimos cargar las categorías.', 'home categories')))
    .finally(() => setCategoriesLoading(false)), []);

  const fetchFeatured = useCallback(() => searchMarketplace(defaultFilters, 0)
    .then((results) => setFeatured(results.slice(0, HOME_FEATURED_LIMIT)))
    .catch((cause) => setFeaturedError(marketplaceFailureMessage(cause, 'No pudimos cargar profesionales.', 'home featured')))
    .finally(() => setFeaturedLoading(false)), []);

  useEffect(() => {
    void fetchCategories();
    void fetchFeatured();
  }, [fetchCategories, fetchFeatured]);

  function retryCategories() {
    setCategoriesLoading(true);
    setCategoriesError(null);
    void fetchCategories();
  }

  function retryFeatured() {
    setFeaturedLoading(true);
    setFeaturedError(null);
    void fetchFeatured();
  }

  useFocusEffect(useCallback(() => {
    let active = true;
    loadWorker();
    void getMyNotificationUnreadCount()
      .then((count) => { if (active) setUnreadNotifications(count); })
      .catch(() => { if (active) setUnreadNotifications(null); });
    return () => {
      active = false;
      workerRequestRef.current += 1;
    };
  }, [loadWorker]));

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
      Alert.alert('No pudimos abrir tu perfil', message);
    } finally { startingWorkerRef.current = false; setStartingWorker(false); }
  }

  function openExplore(params?: Record<string, string>) {
    router.push(params ? ({ pathname: '/(app)/explore', params } as never) : ('/(app)/explore' as never));
  }

  const workerStatus = worker?.approval_status ?? null;
  const panel = getWorkerPanel({ status: workerStatus, loading: workerLoading, starting: startingWorker, loadError: workerLoadError });
  const isHire = mode === 'hire';

  const hero = (
    <HomeHero
      greeting={getGreeting(profile?.first_name)}
      mode={mode}
      onModeChange={setMode}
      onOpenNotifications={() => router.push('/(app)/notifications' as never)}
      onOpenProfile={() => router.push('/(app)/profile')}
      subtitle={isHire ? 'Profesionales aprobados, cerca de ti.' : undefined}
      title={isHire ? '¿Qué necesitas resolver hoy?' : 'Tu oficio, cerca de quien lo necesita.'}
      unreadNotifications={unreadNotifications}
    >
      {isHire ? (
        <HomeSearchBar onSubmit={(query) => openExplore(buildExploreSearchParams(query) ?? undefined)} />
      ) : (
        <WorkerStatusPanel
          panel={panel}
          onAction={(kind) => (kind === 'retry' ? loadWorker() : void openWorkerProfile())}
        />
      )}
    </HomeHero>
  );

  return (
    <Screen contentStyle={styles.screen} footer={<MarketplaceNav active="home" />} header={hero}>
      {isHire ? (
        <>
          <View style={styles.section}>
            <SectionTitle title="Servicios" actionLabel="Ver todo" onAction={() => openExplore()} />
            <CategoryGrid
              categories={categories}
              error={categoriesError}
              loading={categoriesLoading}
              onRetry={retryCategories}
              onSelect={(category) => openExplore({ categoryId: category.id })}
            />
          </View>

          <View style={styles.section}>
            <SectionTitle
              title="Profesionales aprobados"
              actionLabel={featured.length > 0 ? 'Ver todos' : undefined}
              onAction={() => openExplore()}
            />
            {featuredLoading && featured.length === 0 ? (
              <View style={styles.state}><ActivityIndicator color={colors.primary} /></View>
            ) : featuredError ? (
              <View style={styles.inlineState}>
                <Text style={styles.stateText}>{featuredError}</Text>
                <AppButton label="Reintentar" variant="secondary" onPress={retryFeatured} />
              </View>
            ) : featured.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Aún no hay profesionales publicados.</Text>
                <Text style={styles.stateText}>Vuelve pronto o busca por oficio en Explorar.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {featured.map((result) => (
                  <MarketplaceResultCard
                    key={result.worker_id}
                    result={result}
                    onOpen={() => router.push({ pathname: '/(app)/worker/[workerId]', params: { workerId: result.worker_id } } as never)}
                  />
                ))}
              </View>
            )}
          </View>

          <PressableScale
            accessibilityHint="Cambia Inicio al modo Trabajar"
            accessibilityRole="button"
            onPress={() => setMode('work')}
            style={styles.crossSell}
          >
            <View style={styles.crossSellIcon}><AppIcon name="briefcase" color={colors.successOnDark} size={sizing.iconMd} /></View>
            <View style={styles.crossSellCopy}>
              <Text style={styles.crossSellTitle}>¿Ofreces un oficio?</Text>
              <Text style={styles.crossSellText}>Crea tu perfil profesional gratis y recibe solicitudes.</Text>
            </View>
            <AppIcon name="arrowRight" color={colors.white} size={sizing.iconMd} />
          </PressableScale>
        </>
      ) : (
        <WorkModeContent
          status={workerLoading || workerLoadError ? null : workerStatus}
          onOpenCertification={() => router.push('/(app)/certification' as never)}
          onOpenRequests={() => router.push('/(app)/requests' as never)}
        />
      )}
    </Screen>
  );
}

function SectionTitle({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={spacing.sm} onPress={onAction} style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingTop: spacing.xxl },
  section: { gap: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.navy, ...typography.sectionTight },
  sectionAction: { minHeight: sizing.touchTarget, justifyContent: 'center', paddingLeft: spacing.md },
  sectionActionText: { color: colors.primary, ...typography.label },
  pressed: { opacity: 0.6 },
  list: { gap: spacing.md },
  state: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  inlineState: { gap: spacing.md },
  stateText: { color: colors.textSecondary, ...typography.body },
  emptyCard: { gap: spacing.xs, padding: spacing.xl, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  emptyTitle: { color: colors.text, ...typography.bodyStrong },
  crossSell: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg, borderRadius: radii.xxl, backgroundColor: colors.navyDeep },
  crossSellIcon: { width: sizing.touchTarget, height: sizing.touchTarget, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(76, 208, 125, 0.16)' },
  crossSellCopy: { flex: 1, gap: spacing.xxs },
  crossSellTitle: { color: colors.white, ...typography.bodyStrong, letterSpacing: -0.2 },
  crossSellText: { color: colors.textOnDarkMuted, ...typography.caption },
});
