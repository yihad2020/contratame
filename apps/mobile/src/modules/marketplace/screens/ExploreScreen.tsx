import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon, categoryGlyph } from '@/components/ui/Icon';
import { Card, IconBubble } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { shadows, sizing, ui, uiRadii } from '@/constants/theme';
import { ExploreChip } from '@/modules/marketplace/components/ExploreChip';
import { ExploreMap } from '@/modules/marketplace/components/ExploreMap';
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
import { getMyNotificationUnreadCount } from '@/modules/notification/notification-service';

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
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);
  const requestRef = useRef(0);
  const locatingRef = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    void getMyNotificationUnreadCount()
      .then((count) => { if (active) setUnreadNotifications(count); })
      .catch(() => { if (active) setUnreadNotifications(null); });
    return () => { active = false; };
  }, []));

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

  /** "Disponibles hoy": toggles the existing availability-day filter (0 = Domingo, as `weekdayLabels`). */
  function toggleAvailableToday() {
    const today = String(new Date().getDay());
    const next = { ...draft, availabilityDay: draft.availabilityDay === today ? '' : today };
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
  const searching = loading && results.length > 0;
  const today = String(new Date().getDay());
  const resultsTitle = applied.location ? 'Profesionales cerca de ti' : 'Profesionales';
  const countLabel = loading || failure
    ? null
    : `${totalCount} profesional${totalCount === 1 ? '' : 'es'} ${applied.location ? 'cerca de ti' : 'disponibles'}`;

  return (
    <Screen
      contentStyle={styles.screen}
      footer={<MarketplaceNav active="explore" />}
      header={(
        <MarketplaceHeader
          action={{
            label: 'Abrir notificaciones',
            icon: 'notifications',
            badgeCount: unreadNotifications,
            onPress: () => router.push('/(app)/notifications' as never),
          }}
          brand
        >
          <View style={styles.searchBlock}>
            <View style={[styles.searchShell, errors.query && styles.searchError]}>
              <Pressable
                accessibilityLabel="Buscar"
                accessibilityRole="button"
                accessibilityState={{ busy: searching, disabled: searching }}
                disabled={searching}
                hitSlop={6}
                onPress={applyFilters}
                style={({ pressed }) => [styles.searchSubmit, pressed && styles.pressed]}
              >
                {searching ? <ActivityIndicator color={ui.accent} /> : <Icon color={ui.ink} name="magnify" size={28} />}
              </Pressable>
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
                placeholderTextColor={ui.muted}
                returnKeyType="search"
                style={styles.searchInput}
                value={draft.query}
              />
              <Pressable
                accessibilityLabel="Mostrar filtros"
                accessibilityRole="button"
                accessibilityState={{ expanded: filtersVisible }}
                onPress={() => setFiltersVisible((current) => !current)}
                style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
              >
                <Icon color={ui.white} name="tune-variant" size={24} />
              </Pressable>
            </View>
            {errors.query ? (
              <View style={styles.searchErrorPill}>
                <Icon color={ui.danger} name="alert-circle" size={16} />
                <Text style={styles.errorText}>{errors.query}</Text>
              </View>
            ) : null}
          </View>
        </MarketplaceHeader>
      )}
    >
      <ScrollView contentContainerStyle={styles.chipRow} horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} style={styles.chipScroller}>
        <ExploreChip
          label="Todos"
          onPress={() => { if (draft.categoryId) selectCategory(draft.categoryId); }}
          selected={!draft.categoryId}
        />
        <ExploreChip
          accessibilityLabel={draft.location ? 'Actualizar ubicación' : 'Cerca de mí'}
          icon="map-marker"
          label="Cerca de mí"
          loading={locating}
          onPress={() => void locateCustomer()}
          selected={Boolean(draft.location)}
        />
        <ExploreChip icon="calendar-today" label="Disponibles hoy" onPress={toggleAvailableToday} selected={draft.availabilityDay === today} />
        {categories.map((category) => {
          const glyph = categoryGlyph(category.icon_key, category.slug);
          return (
            <ExploreChip
              key={category.id}
              icon={glyph.name}
              iconColor={glyph.color}
              label={category.name}
              onPress={() => selectCategory(category.id)}
              selected={draft.categoryId === category.id}
            />
          );
        })}
      </ScrollView>
      {categoryFailure ? <ErrorMessage>{categoryFailure}</ErrorMessage> : null}
      {errors.availability ? <ErrorMessage>{errors.availability}</ErrorMessage> : null}
      {locationNotice ? <FeedbackMessage tone="info">{locationNotice}</FeedbackMessage> : null}
      {filtersVisible ? <MarketplaceFilters draft={draft} errors={errors} busy={loading} onChange={setDraft} onApply={applyFilters} onClear={clearFilters} /> : null}
      <ExploreMap countLabel={countLabel} locating={locating} location={draft.location} onLocate={() => void locateCustomer()} />
      <View style={styles.resultsHeader}>
        <View style={styles.resultsCopy}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{resultsTitle}</Text>
          {!loading && !failure ? <Text style={styles.resultCount}>{totalCount} resultado{totalCount === 1 ? '' : 's'}</Text> : null}
        </View>
        <Pressable
          accessibilityLabel="Actualizar resultados"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => void loadPage(applied, 0, true)}
          style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}
        >
          <Text style={styles.refreshLabel}>Actualizar</Text>
          <Icon color={ui.accent} name="refresh" size={20} />
        </Pressable>
      </View>
      {loading && results.length === 0 ? (
        <Card style={styles.loading}>
          <ActivityIndicator color={ui.accent} size="large" />
          <Text style={styles.loadingText}>Buscando profesionales…</Text>
        </Card>
      ) : null}
      {failure ? (
        <Card style={styles.state}>
          <ErrorMessage>{failure}</ErrorMessage>
          <PillButton label="Reintentar" icon="refresh" onPress={() => void loadPage(applied, 0, true)} />
        </Card>
      ) : null}
      {!loading && !failure && results.length === 0 ? (
        <Card style={styles.empty}>
          <IconBubble name="account-search" size={64} variant="soft" />
          <Text style={styles.emptyTitle}>No encontramos profesionales con estos filtros.</Text>
          <Text style={styles.emptyCopy}>Prueba otra categoría, zona o rango de precio.</Text>
          <PillButton label="Limpiar filtros" onPress={clearFilters} style={styles.emptyAction} variant="outline" />
        </Card>
      ) : null}
      <View style={styles.resultList}>
        {results.map((result) => <MarketplaceResultCard key={result.worker_id} result={result} onOpen={() => router.push({ pathname: '/(app)/worker/[workerId]', params: { workerId: result.worker_id } } as never)} />)}
      </View>
      {pageFailure ? (
        <View style={styles.state}>
          <ErrorMessage>{pageFailure}</ErrorMessage>
          <PillButton label="Reintentar página" onPress={() => void loadPage(applied, results.length, false)} variant="outline" />
        </View>
      ) : null}
      {hasMore ? <PillButton label="Cargar más" loading={loadingPage} onPress={() => void loadPage(applied, results.length, false)} variant="outline" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16, paddingTop: 16 },
  searchBlock: { gap: 8, marginTop: -4 },
  searchShell: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 7, borderRadius: uiRadii.lg, borderWidth: 1.5, borderColor: ui.card, backgroundColor: ui.card, ...shadows.raised },
  searchError: { borderColor: ui.danger },
  searchSubmit: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchInput: { flex: 1, minHeight: 48, color: ui.ink, fontSize: 17, lineHeight: 22 },
  filterButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.accent },
  searchErrorPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: uiRadii.pill, backgroundColor: ui.dangerSoft },
  errorText: { flexShrink: 1, color: ui.danger, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  pressed: { opacity: 0.72 },
  chipScroller: { flexGrow: 0, marginHorizontal: -sizing.screenPadding },
  chipRow: { alignItems: 'center', gap: 10, paddingHorizontal: sizing.screenPadding, paddingVertical: 4 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 },
  resultsCopy: { flexShrink: 1, gap: 2 },
  sectionTitle: { color: ui.ink, fontSize: 21, lineHeight: 28, fontWeight: '700' },
  resultCount: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  refresh: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshLabel: { color: ui.accent, fontSize: 15, fontWeight: '600' },
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: ui.muted, fontSize: 15, lineHeight: 21 },
  state: { gap: 14 },
  empty: { gap: 12, padding: 24, alignItems: 'center' },
  emptyTitle: { color: ui.ink, textAlign: 'center', fontSize: 18, lineHeight: 24, fontWeight: '700' },
  emptyCopy: { color: ui.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
  emptyAction: { alignSelf: 'stretch', marginTop: 4 },
  resultList: { gap: 14 },
});
