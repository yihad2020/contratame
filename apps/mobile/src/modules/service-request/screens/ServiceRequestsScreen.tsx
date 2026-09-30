import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
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
      <View accessibilityRole="tablist" style={styles.switcher}>
        <PerspectiveButton active={perspective === 'customer'} label="Como cliente" onPress={() => changePerspective('customer')} />
        <PerspectiveButton active={perspective === 'worker'} label="Como profesional" onPress={() => changePerspective('worker')} />
      </View>
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

function PerspectiveButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.switchButton, active && styles.switchActive]}>
      <Text style={[styles.switchLabel, active && styles.switchLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function RequestCard({ item }: { item: ServiceRequestListItem }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/(app)/request/[requestId]', params: { requestId: item.request_id } } as never)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardCopy}>
          <Text style={styles.service}>{item.service_title}</Text>
          <Text style={styles.counterpart}>{item.perspective === 'customer' ? 'Profesional' : 'Cliente'}: {item.counterpart_display_name}</Text>
        </View>
        <StatusBadge label={serviceRequestStatusLabels[item.status]} tone={statusTone(item.status)} />
      </View>
      <Text numberOfLines={2} style={styles.description}>{item.description}</Text>
      <View style={styles.metaRow}><AppIcon name="location" color={colors.textSecondary} size={sizing.iconSm} /><Text style={styles.meta}>{item.job_area_label}</Text></View>
      <View style={styles.metaRow}><AppIcon name="time" color={colors.textSecondary} size={sizing.iconSm} /><Text style={styles.meta}>{formatRequestDate(item.preferred_date)}{item.preferred_time ? ` · ${item.preferred_time}` : ''}</Text></View>
      <View style={styles.openRow}><Text style={styles.openLabel}>Ver detalle</Text><AppIcon name="chevronRight" size={sizing.iconSm} /></View>
    </Pressable>
  );
}

function statusTone(status: ServiceRequestStatus): 'success' | 'warning' | 'danger' {
  if (status === 'pending') return 'warning';
  if (status === 'quoted' || status === 'accepted') return 'success';
  return 'danger';
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  switcher: { flexDirection: 'row', padding: spacing.xs, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  switchButton: { flex: 1, minHeight: sizing.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md },
  switchActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  switchLabel: { color: colors.textSecondary, ...typography.label },
  switchLabelActive: { color: colors.primary },
  count: { color: colors.textSecondary, ...typography.caption },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  feedback: { gap: spacing.md },
  empty: { minHeight: 260, gap: spacing.md, justifyContent: 'center', padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  emptyIcon: { width: 58, height: 58, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.primarySoft },
  emptyTitle: { color: colors.navy, textAlign: 'center', ...typography.title },
  muted: { color: colors.textSecondary, textAlign: 'center', ...typography.body },
  list: { gap: spacing.md },
  card: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  pressed: { opacity: 0.76 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardCopy: { flex: 1, gap: spacing.xs },
  service: { color: colors.navy, ...typography.section },
  counterpart: { color: colors.primary, ...typography.caption, fontWeight: '700' },
  description: { color: colors.text, ...typography.body },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flex: 1, color: colors.textSecondary, ...typography.caption },
  openRow: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  openLabel: { color: colors.primary, ...typography.label },
});
