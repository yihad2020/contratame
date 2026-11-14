import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { getCategoryIcon } from '@/modules/marketplace/category-icons';
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
  marketplaceDraftFromRouteParams,
  mergeMarketplaceResults,
  validateMarketplaceFilters,
  withoutMarketplaceAppliedLocation,
  withoutMarketplaceDraftLocation,
} from '@/modules/marketplace/validation';

const defaultFilterCheck = validateMarketplaceFilters(emptyMarketplaceDraft);
if (!defaultFilterCheck.ok) throw new Error('Invalid default marketplace filters');
const defaultFilters = defaultFilterCheck.value;

export function ExploreScreen() {
  const routeParams = useLocalSearchParams<{ q?: string; categoryId?: string }>();
  const [initial] = useState(() => {
    const routeDraft = marketplaceDraftFromRouteParams(routeParams);
    const checked = validateMarketplaceFilters(routeDraft);
    return checked.ok
      ? { draft: routeDraft, filters: checked.value }
      : { draft: { ...emptyMarketplaceDraft }, filters: defaultFilters };
  });
  const [draft, setDraft] = useState<MarketplaceFilterDraft>(initial.draft);
  const [applied, setApplied] = useState<AppliedFilters>(initial.filters);
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
    void searchMarketplace(initial.filters, 0)
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
  }, [initial.filters]);

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
      header={(
        <MarketplaceHeader brand title="Explorar" subtitle="Profesionales aprobados para tu servicio.">
          <View style={[styles.searchBar, errors.query && styles.searchError]}>
            <AppIcon name="search" color={colors.navyDeep} size={sizing.iconMd} />
            <TextInput
              accessibilityLabel="Buscar oficios o servicios"
              maxLength={100}
              onChangeText={(query) => {
                setDraft((current) => ({ ...current, query }));
                setErrors((current) => {
                  const next = { ...current };
                  delete next.query;
                  return next;
                });
              }}
              onSubmitEditing={applyFilters}
              placeholder="Busca un oficio o servicio"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              style={styles.searchInput}
              value={draft.query}
            />
            <PressableScale
              accessibilityLabel={filtersVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
              accessibilityRole="button"
              accessibilityState={{ expanded: filtersVisible }}
              onPress={() => setFiltersVisible((current) => !current)}
              style={[styles.iconButton, filtersVisible ? styles.iconButtonActive : styles.iconButtonSoft]}
            >
              <AppIcon name="filter" color={filtersVisible ? colors.white : colors.navyDeep} size={sizing.iconMd} />
            </PressableScale>
            <PressableScale accessibilityLabel="Buscar" accessibilityRole="button" onPress={applyFilters} style={[styles.iconButton, styles.iconButtonPrimary]}>
              {loading && results.length > 0
                ? <ActivityIndicator color={colors.white} />
                : <AppIcon name="arrowRight" color={colors.white} size={sizing.iconMd} />}
            </PressableScale>
          </View>
          {errors.query ? <Text style={styles.errorOnDark}>{errors.query}</Text> : null}
        </MarketplaceHeader>
      )}
    >
      <ScrollView
        horizontal
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroller}
      >
        <PressableScale
          accessibilityLabel={draft.location ? 'Actualizar ubicación' : 'Buscar cerca de mí'}
          accessibilityRole="button"
          accessibilityState={{ busy: locating, selected: Boolean(draft.location) }}
          onPress={() => void locateCustomer()}
          pressedScale={0.94}
          style={[styles.chip, draft.location ? styles.chipSelected : styles.chipLocation]}
        >
          {locating ? <ActivityIndicator color={draft.location ? colors.white : colors.primary} size="small" /> : <AppIcon name="location" color={draft.location ? colors.white : colors.primary} size={sizing.iconSm} />}
          <Text style={[styles.chipLabel, draft.location ? styles.chipLabelSelected : styles.chipLabelLocation]}>Cerca de mí</Text>
        </PressableScale>
        {categories.map((category) => {
          const selected = draft.categoryId === category.id;
          return (
            <PressableScale
              key={category.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => selectCategory(category.id)}
              pressedScale={0.94}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <AppIcon name={getCategoryIcon(category.icon_key)} color={selected ? colors.white : colors.navy} size={sizing.iconSm} />
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{category.name}</Text>
            </PressableScale>
          );
        })}
      </ScrollView>
      {categoryFailure ? <ErrorMessage>{categoryFailure}</ErrorMessage> : null}
      {locationNotice ? <FeedbackMessage tone="info">{locationNotice}</FeedbackMessage> : null}
      {filtersVisible ? <MarketplaceFilters draft={draft} errors={errors} busy={loading} onChange={setDraft} onApply={applyFilters} onClear={clearFilters} /> : null}
      <View style={styles.resultsHeader}>
        <View style={styles.resultsCopy}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Profesionales</Text>
          {!loading && !failure ? <Text style={styles.resultCount}>{totalCount} resultado{totalCount === 1 ? '' : 's'}</Text> : null}
        </View>
        <PressableScale accessibilityLabel="Actualizar resultados" accessibilityRole="button" onPress={() => void loadPage(applied, 0, true)} style={styles.refresh}>
          <AppIcon name="refresh" color={colors.navy} size={sizing.iconMd} />
        </PressableScale>
      </View>
      {loading && results.length === 0 ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>Buscando profesionales…</Text></View> : null}
      {failure ? <View style={styles.state}><ErrorMessage>{failure}</ErrorMessage><AppButton label="Reintentar" onPress={() => void loadPage(applied, 0, true)} /></View> : null}
      {!loading && !failure && results.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><AppIcon name="search" color={colors.primary} size={sizing.iconLg} /></View>
          <Text style={styles.emptyTitle}>No encontramos profesionales con estos filtros.</Text>
          <Text style={styles.emptyCopy}>Prueba otra categoría, zona o rango de precio.</Text>
          <AppButton label="Limpiar filtros" variant="secondary" onPress={clearFilters} />
        </View>
      ) : null}
      <View style={styles.resultList}>
        {results.map((result) => <MarketplaceResultCard key={result.worker_id} result={result} onOpen={() => router.push({ pathname: '/(app)/worker/[workerId]', params: { workerId: result.worker_id } } as never)} />)}
      </View>
      {pageFailure ? <View style={styles.state}><ErrorMessage>{pageFailure}</ErrorMessage><AppButton label="Reintentar página" variant="secondary" onPress={() => void loadPage(applied, results.length, false)} /></View> : null}
      {hasMore ? <AppButton label="Cargar más" variant="secondary" loading={loadingPage} onPress={() => void loadPage(applied, results.length, false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingLeft: spacing.lg, borderRadius: radii.xxl, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.surface },
  searchError: { borderColor: colors.danger },
  searchInput: { flex: 1, minHeight: sizing.touchTarget, color: colors.text, ...typography.bodyStrong, fontWeight: '600', letterSpacing: -0.2 },
  iconButton: { width: sizing.touchTarget, height: sizing.touchTarget, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  iconButtonSoft: { backgroundColor: colors.surfaceMuted },
  iconButtonActive: { backgroundColor: colors.navyDeep },
  iconButtonPrimary: { backgroundColor: colors.primary },
  errorOnDark: { color: colors.warningOnDark, ...typography.caption },
  chipScroller: { marginHorizontal: -sizing.screenPadding },
  chipRow: { gap: spacing.sm, paddingHorizontal: sizing.screenPadding },
  chip: { minHeight: sizing.touchTarget - 4, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipLocation: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipSelected: { borderColor: colors.navyDeep, backgroundColor: colors.navyDeep },
  chipLabel: { color: colors.text, ...typography.label },
  chipLabelLocation: { color: colors.primaryPressed },
  chipLabelSelected: { color: colors.white },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  resultsCopy: { gap: spacing.xxs },
  sectionTitle: { color: colors.navy, ...typography.sectionTight },
  resultCount: { color: colors.textSecondary, ...typography.caption },
  refresh: { width: sizing.touchTarget, height: sizing.touchTarget, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.textSecondary, ...typography.body },
  state: { gap: spacing.md },
  empty: { gap: spacing.md, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xxl, backgroundColor: colors.surface, alignItems: 'stretch' },
  emptyIcon: { alignSelf: 'center', width: 56, height: 56, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  emptyTitle: { color: colors.text, textAlign: 'center', ...typography.section },
  emptyCopy: { color: colors.textSecondary, textAlign: 'center', ...typography.body },
  resultList: { gap: spacing.md },
});
