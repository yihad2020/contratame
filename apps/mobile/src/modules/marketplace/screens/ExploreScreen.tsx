import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { MarketplaceFilters } from '@/modules/marketplace/components/MarketplaceFilters';
import { MarketplaceResultCard } from '@/modules/marketplace/components/MarketplaceResultCard';
import { marketplaceFailureMessage } from '@/modules/marketplace/marketplace-errors';
import {
  loadMarketplaceCategories,
  searchMarketplace,
} from '@/modules/marketplace/marketplace-service';
import type {
  MarketplaceCategory,
  MarketplaceFilterDraft,
  MarketplaceFilters as AppliedFilters,
  MarketplaceResult,
} from '@/modules/marketplace/types';
import {
  emptyMarketplaceDraft,
  mergeMarketplaceResults,
  validateMarketplaceFilters,
  withoutMarketplaceAppliedLocation,
  withoutMarketplaceDraftLocation,
} from '@/modules/marketplace/validation';

const initialFilterCheck = validateMarketplaceFilters(emptyMarketplaceDraft);
if (!initialFilterCheck.ok) throw new Error('Invalid default marketplace filters');
const initialFilters = initialFilterCheck.value;

export function ExploreScreen() {
  const [draft, setDraft] = useState<MarketplaceFilterDraft>({ ...emptyMarketplaceDraft });
  const [applied, setApplied] = useState<AppliedFilters>(initialFilters);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [results, setResults] = useState<MarketplaceResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pageFailure, setPageFailure] = useState<string | null>(null);
  const [categoryFailure, setCategoryFailure] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [locating, setLocating] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const requestRef = useRef(0);
  const locatingRef = useRef(false);

  const loadPage = useCallback(async (filters: AppliedFilters, offset: number, reset: boolean) => {
    const request = ++requestRef.current;
    if (reset) { setLoading(true); setFailure(null); }
    else { setLoadingPage(true); setPageFailure(null); }
    try {
      const next = await searchMarketplace(filters, offset);
      if (request !== requestRef.current) return;
      setResults((current) => reset ? next : mergeMarketplaceResults(current, next));
      setTotalCount((current) => next[0]?.total_count ?? (reset ? 0 : current));
    } catch (cause) {
      if (request !== requestRef.current) return;
      const message = marketplaceFailureMessage(cause, 'No pudimos buscar profesionales. Inténtalo nuevamente.', 'search');
      if (reset) setFailure(message); else setPageFailure(message);
    } finally {
      if (request === requestRef.current) {
        if (reset) setLoading(false); else setLoadingPage(false);
      }
    }
  }, []);

  useEffect(() => {
    const request = ++requestRef.current;
    void searchMarketplace(initialFilters, 0)
      .then((next) => {
        if (request !== requestRef.current) return;
        setResults(next);
        setTotalCount(next[0]?.total_count ?? 0);
      })
      .catch((cause) => {
        if (request !== requestRef.current) return;
        setFailure(marketplaceFailureMessage(cause, 'No pudimos buscar profesionales. Inténtalo nuevamente.', 'initial search'));
      })
      .finally(() => {
        if (request === requestRef.current) setLoading(false);
      });
    void loadMarketplaceCategories()
      .then(setCategories)
      .catch((cause) => setCategoryFailure(marketplaceFailureMessage(cause, 'No pudimos cargar las categorías. Puedes seguir buscando por texto.', 'load categories')));
  }, []);

  function applyFilters() {
    const checked = validateMarketplaceFilters(draft);
    if (!checked.ok) { setErrors(checked.errors); return; }
    setErrors({});
    setApplied(checked.value);
    setFiltersVisible(false);
    void loadPage(checked.value, 0, true);
  }

  function clearFilters() {
    const nextDraft = { ...emptyMarketplaceDraft, location: draft.location };
    const checked = validateMarketplaceFilters(nextDraft);
    if (!checked.ok) return;
    setDraft(nextDraft);
    setErrors({});
    setApplied(checked.value);
    setFiltersVisible(false);
    void loadPage(checked.value, 0, true);
  }

  function selectCategory(categoryId: string) {
    const next = { ...draft, categoryId: draft.categoryId === categoryId ? '' : categoryId };
    setDraft(next);
    const checked = validateMarketplaceFilters(next);
    if (!checked.ok) { setErrors(checked.errors); return; }
    setErrors({});
    setApplied(checked.value);
    void loadPage(checked.value, 0, true);
  }

  async function locateCustomer() {
    if (locatingRef.current) return;
    locatingRef.current = true;
    setLocating(true);
    setLocationNotice(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        const nextApplied = withoutMarketplaceAppliedLocation(applied);
        setDraft(withoutMarketplaceDraftLocation);
        setApplied(nextApplied);
        void loadPage(nextApplied, 0, true);
        setLocationNotice('No diste permiso de ubicación. Puedes seguir explorando normalmente.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDraft((value) => ({
        ...value,
        location: { latitude: current.coords.latitude, longitude: current.coords.longitude },
      }));
      setLocationNotice('Ubicación lista. Aplicaremos el radio de atención de cada profesional; puedes agregar un límite en filtros.');
    } catch (cause) {
      setLocationNotice(marketplaceFailureMessage(cause, 'No pudimos obtener tu ubicación. Puedes seguir explorando normalmente.', 'current location'));
    } finally {
      locatingRef.current = false;
      setLocating(false);
    }
  }

  const hasMore = results.length < totalCount;

  return (
    <Screen
      contentStyle={styles.screen}
      footer={<MarketplaceNav active="explore" />}
      header={<MarketplaceHeader brand title="Explorar" subtitle="Encuentra profesionales aprobados para tu servicio." />}
    >
      <View style={styles.searchRow}>
        <View style={[styles.searchShell, errors.query && styles.searchError]}>
          <AppIcon name="search" color={colors.textSecondary} size={sizing.iconMd} />
          <TextInput
            accessibilityLabel="Buscar oficios o servicios"
            onChangeText={(query) => {
              setDraft((current) => ({ ...current, query }));
              setErrors((current) => {
                const next = { ...current };
                delete next.query;
                return next;
              });
            }}
            onSubmitEditing={applyFilters}
            placeholder="Buscar oficios o servicios"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            style={styles.searchInput}
            value={draft.query}
          />
        </View>
        <Pressable accessibilityLabel="Mostrar filtros" accessibilityRole="button" onPress={() => setFiltersVisible((current) => !current)} style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}>
          <AppIcon name="filter" color={colors.white} size={sizing.iconMd} />
        </Pressable>
      </View>
      {errors.query ? <Text style={styles.errorText}>{errors.query}</Text> : null}
      <View style={styles.quickActions}>
        <View style={styles.quickAction}><AppButton label="Buscar" icon="search" loading={loading && results.length > 0} onPress={applyFilters} /></View>
        <View style={styles.quickAction}><AppButton label={draft.location ? 'Actualizar ubicación' : 'Cerca de mí'} icon="location" variant="secondary" loading={locating} onPress={() => void locateCustomer()} /></View>
      </View>
      {locationNotice ? <FeedbackMessage tone="info">{locationNotice}</FeedbackMessage> : null}
      <View style={styles.categories}>
        <Text style={styles.sectionTitle}>Categorías</Text>
        {categoryFailure ? <ErrorMessage>{categoryFailure}</ErrorMessage> : null}
        <View style={styles.categoryWrap}>
          {categories.map((category) => {
            const selected = draft.categoryId === category.id;
            return (
              <Pressable key={category.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => selectCategory(category.id)} style={[styles.categoryChip, selected && styles.categorySelected]}>
                <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>{category.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {filtersVisible ? <MarketplaceFilters draft={draft} errors={errors} busy={loading} onChange={setDraft} onApply={applyFilters} onClear={clearFilters} /> : null}
      <View style={styles.resultsHeader}>
        <View>
          <Text style={styles.sectionTitle}>Profesionales</Text>
          {!loading && !failure ? <Text style={styles.resultCount}>{totalCount} resultado{totalCount === 1 ? '' : 's'}</Text> : null}
        </View>
        <Pressable accessibilityLabel="Actualizar resultados" accessibilityRole="button" onPress={() => void loadPage(applied, 0, true)} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}><AppIcon name="refresh" color={colors.primary} size={sizing.iconMd} /></Pressable>
      </View>
      {loading && results.length === 0 ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>Buscando profesionales…</Text></View> : null}
      {failure ? <View style={styles.state}><ErrorMessage>{failure}</ErrorMessage><AppButton label="Reintentar" onPress={() => void loadPage(applied, 0, true)} /></View> : null}
      {!loading && !failure && results.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No encontramos profesionales con estos filtros.</Text><Text style={styles.emptyCopy}>Prueba otra categoría, zona o rango de precio.</Text><AppButton label="Limpiar filtros" variant="secondary" onPress={clearFilters} /></View> : null}
      <View style={styles.resultList}>
        {results.map((result) => <MarketplaceResultCard key={result.worker_id} result={result} onOpen={() => router.push({ pathname: '/(app)/worker/[workerId]', params: { workerId: result.worker_id } } as never)} />)}
      </View>
      {pageFailure ? <View style={styles.state}><ErrorMessage>{pageFailure}</ErrorMessage><AppButton label="Reintentar página" variant="secondary" onPress={() => void loadPage(applied, results.length, false)} /></View> : null}
      {hasMore ? <AppButton label="Cargar más" variant="secondary" loading={loadingPage} onPress={() => void loadPage(applied, results.length, false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.lg },
  searchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  searchShell: { flex: 1, minHeight: sizing.inputHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.lg },
  searchError: { borderColor: colors.danger },
  searchInput: { flex: 1, minHeight: sizing.inputHeight - 2, color: colors.text, ...typography.body },
  filterButton: { width: sizing.inputHeight, height: sizing.inputHeight, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  pressed: { opacity: 0.72 },
  errorText: { color: colors.danger, ...typography.caption },
  quickActions: { flexDirection: 'row', gap: spacing.sm },
  quickAction: { flex: 1 },
  categories: { gap: spacing.sm },
  sectionTitle: { color: colors.navy, ...typography.section },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: { minHeight: sizing.touchTarget, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  categorySelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  categoryLabel: { color: colors.textSecondary, ...typography.label },
  categoryLabelSelected: { color: colors.primary },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultCount: { color: colors.textSecondary, ...typography.caption },
  refresh: { width: sizing.touchTarget, height: sizing.touchTarget, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.textSecondary, ...typography.body },
  state: { gap: spacing.md },
  empty: { gap: spacing.md, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface, alignItems: 'stretch' },
  emptyTitle: { color: colors.text, textAlign: 'center', ...typography.section },
  emptyCopy: { color: colors.textSecondary, textAlign: 'center', ...typography.body },
  resultList: { gap: spacing.md },
});
