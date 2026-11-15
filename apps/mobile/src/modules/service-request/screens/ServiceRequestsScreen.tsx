import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { MenuList } from '@/components/ui/MenuList';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { serviceRequestFailureMessage } from '@/modules/service-request/service-request-errors';
import {
  formatRequestDate,
  mergeServiceRequestPages,
  serviceRequestStatusLabels,
} from '@/modules/service-request/service-request-model';
import {
  listMyServiceRequests,
} from '@/modules/service-request/service-request-service';
import type {
  ServiceRequestListItem,
  ServiceRequestPerspective,
  ServiceRequestStatus,
} from '@/modules/service-request/types';

export function ServiceRequestsScreen() {
  const [perspective, setPerspective] = useState<ServiceRequestPerspective>('customer');
  const [items, setItems] = useState<ServiceRequestListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pageFailure, setPageFailure] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (currentPerspective: ServiceRequestPerspective, offset: number, reset: boolean) => {
    const request = ++requestRef.current;
    if (reset) { setLoading(true); setFailure(null); }
    else { setLoadingPage(true); setPageFailure(null); }
    try {
      const next = await listMyServiceRequests(currentPerspective, offset);
      if (request !== requestRef.current) return;
      setItems((current) => reset ? next : mergeServiceRequestPages(current, next));
      setTotalCount((current) => next[0]?.total_count ?? (reset ? 0 : current));
    } catch (cause) {
      if (request !== requestRef.current) return;
      const message = serviceRequestFailureMessage(cause);
      if (reset) setFailure(message); else setPageFailure(message);
    } finally {
      if (request === requestRef.current) {
        if (reset) setLoading(false); else setLoadingPage(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load(perspective, 0, true);
    return () => { requestRef.current += 1; };
  }, [load, perspective]));

  function changePerspective(next: ServiceRequestPerspective) {
    if (next === perspective) return;
    setPerspective(next);
    setItems([]);
    setTotalCount(0);
    setFailure(null);
    setPageFailure(null);
  }

  const hasMore = items.length < totalCount;
  return (
    <Screen
      contentStyle={styles.screen}
      footer={<MarketplaceNav active="requests" />}
      header={<MarketplaceHeader brand title="Solicitudes" subtitle="Consulta solicitudes enviadas y recibidas." />}
    >
      <SegmentedControl
        options={[{ value: 'customer', label: 'Como cliente' }, { value: 'worker', label: 'Como profesional' }]}
        value={perspective}
        onChange={changePerspective}
      />
      <MenuList
        items={[{ key: 'bookings', title: 'Mis trabajos contratados', description: 'Contrataciones programadas y su estado', icon: 'briefcase', onPress: () => router.push('/(app)/bookings' as never) }]}
      />
      {!loading && !failure ? <Text style={styles.count}>{totalCount} solicitud{totalCount === 1 ? '' : 'es'}</Text> : null}
      {loading && items.length === 0 ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Cargando solicitudes…</Text></View> : null}
      {failure ? <View style={styles.feedback}><ErrorMessage>{failure}</ErrorMessage><AppButton label="Reintentar" onPress={() => void load(perspective, 0, true)} /></View> : null}
      {!loading && !failure && items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><AppIcon name="briefcase" color={colors.primary} size={sizing.iconLg} /></View>
          <Text style={styles.emptyTitle}>{perspective === 'customer' ? 'Aún no enviaste solicitudes' : 'Aún no recibiste solicitudes'}</Text>
          <Text style={styles.muted}>{perspective === 'customer'
            ? 'Explora profesionales aprobados y solicita uno de sus servicios activos.'
            : 'Las solicitudes dirigidas a tu perfil profesional aparecerán aquí.'}</Text>
          {perspective === 'customer' ? <AppButton label="Explorar profesionales" onPress={() => router.push('/(app)/explore' as never)} /> : null}
        </View>
      ) : null}
      <View style={styles.list}>
        {items.map((item) => <RequestCard key={item.request_id} item={item} />)}
      </View>
      {pageFailure ? <View style={styles.feedback}><ErrorMessage>{pageFailure}</ErrorMessage><AppButton label="Reintentar página" variant="secondary" onPress={() => void load(perspective, items.length, false)} /></View> : null}
      {hasMore ? <AppButton label="Cargar más" variant="secondary" loading={loadingPage} onPress={() => void load(perspective, items.length, false)} /> : null}
    </Screen>
  );
}

function RequestCard({ item }: { item: ServiceRequestListItem }) {
  return (
    <PressableScale
      accessibilityHint="Abre el detalle de la solicitud"
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/(app)/request/[requestId]', params: { requestId: item.request_id } } as never)}
      pressedScale={0.985}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardCopy}>
          <Text style={styles.service}>{item.service_title}</Text>
          <Text style={styles.counterpart}>{item.perspective === 'customer' ? 'Profesional' : 'Cliente'}: {item.counterpart_display_name}</Text>
        </View>
        <StatusBadge label={serviceRequestStatusLabels[item.status]} tone={statusTone(item.status)} />
      </View>
      <Text numberOfLines={2} style={styles.description}>{item.description}</Text>
      <View style={styles.metaBox}>
        <View style={styles.metaRow}><AppIcon name="location" color={colors.textSecondary} size={sizing.iconSm} /><Text numberOfLines={1} style={styles.meta}>{item.job_area_label}</Text></View>
        <View style={styles.metaRow}><AppIcon name="time" color={colors.textSecondary} size={sizing.iconSm} /><Text numberOfLines={1} style={styles.meta}>{formatRequestDate(item.preferred_date)}{item.preferred_time ? ` · ${item.preferred_time}` : ''}</Text></View>
      </View>
    </PressableScale>
  );
}

function statusTone(status: ServiceRequestStatus): 'success' | 'warning' | 'danger' {
  if (status === 'pending') return 'warning';
  if (status === 'quoted' || status === 'accepted') return 'success';
  return 'danger';
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  count: { color: colors.textSecondary, ...typography.caption, paddingHorizontal: spacing.xs },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  feedback: { gap: spacing.md },
  empty: { minHeight: 260, gap: spacing.md, justifyContent: 'center', padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xxl, backgroundColor: colors.surface },
  emptyIcon: { width: 56, height: 56, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: radii.xl, backgroundColor: colors.primarySoft },
  emptyTitle: { color: colors.navy, textAlign: 'center', ...typography.title, letterSpacing: -0.4 },
  muted: { color: colors.textSecondary, textAlign: 'center', ...typography.body },
  list: { gap: spacing.md },
  card: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xxl, backgroundColor: colors.surface },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardCopy: { flex: 1, gap: spacing.xs },
  service: { color: colors.navy, fontSize: 17, lineHeight: 22, fontWeight: '800', letterSpacing: -0.3 },
  counterpart: { color: colors.textSecondary, ...typography.caption, fontWeight: '600' },
  description: { color: colors.text, ...typography.body },
  metaBox: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flex: 1, color: colors.textSecondary, ...typography.caption },
});
