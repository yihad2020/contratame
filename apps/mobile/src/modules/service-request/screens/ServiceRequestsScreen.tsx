import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon, glyphForText, type IconName } from '@/components/ui/Icon';
import { Card, IconBubble } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage } from '@/components/ui/Typography';
import { shadows, ui, uiRadii } from '@/constants/theme';
import { getMyNotificationUnreadCount } from '@/modules/notification/notification-service';
import { RequestStatusPill } from '@/modules/service-request/components/RequestKit';
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

type StatusFilter = 'pending' | 'progress' | 'closed';

const filters: { key: StatusFilter; label: string; icon: IconName; statuses: ServiceRequestStatus[] }[] = [
  { key: 'pending', label: 'Pendientes', icon: 'clock-time-four', statuses: ['pending'] },
  { key: 'progress', label: 'En proceso', icon: 'cog', statuses: ['quoted', 'accepted'] },
  { key: 'closed', label: 'Cerradas', icon: 'archive', statuses: ['rejected', 'cancelled', 'expired'] },
];

export function ServiceRequestsScreen() {
  const [perspective, setPerspective] = useState<ServiceRequestPerspective>('customer');
  const [items, setItems] = useState<ServiceRequestListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pageFailure, setPageFailure] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);
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

  useFocusEffect(useCallback(() => {
    let active = true;
    void getMyNotificationUnreadCount()
      .then((count) => { if (active) setUnreadNotifications(count); })
      .catch(() => { if (active) setUnreadNotifications(null); });
    return () => { active = false; };
  }, []));

  function changePerspective(next: ServiceRequestPerspective) {
    if (next === perspective) return;
    setPerspective(next);
    setItems([]);
    setTotalCount(0);
    setFailure(null);
    setPageFailure(null);
    setStatusFilter(null);
  }

  const hasMore = items.length < totalCount;
  const activeFilter = filters.find((filter) => filter.key === statusFilter) ?? null;
  const visibleItems = activeFilter ? items.filter((item) => activeFilter.statuses.includes(item.status)) : items;
  const ready = !loading && !failure;

  return (
    <Screen
      contentStyle={styles.screen}
      footer={<MarketplaceNav active="requests" />}
      header={(
        <MarketplaceHeader
          action={{
            label: 'Abrir notificaciones',
            icon: 'notifications',
            badgeCount: unreadNotifications,
            onPress: () => router.push('/(app)/notifications' as never),
          }}
          brand
          subtitle="Aquí puedes ver el estado de tus solicitudes."
          title="Mis solicitudes"
        >
          <View accessibilityRole="tablist" style={styles.switcher}>
            <PerspectiveButton active={perspective === 'customer'} label="Como cliente" onPress={() => changePerspective('customer')} />
            <PerspectiveButton active={perspective === 'worker'} label="Como profesional" onPress={() => changePerspective('worker')} />
          </View>
          <View style={styles.filters}>
            {filters.map((filter) => (
              <FilterPill
                key={filter.key}
                active={statusFilter === filter.key}
                count={items.filter((item) => filter.statuses.includes(item.status)).length}
                icon={filter.icon}
                label={filter.label}
                onPress={() => setStatusFilter((current) => current === filter.key ? null : filter.key)}
              />
            ))}
          </View>
        </MarketplaceHeader>
      )}
    >
      <Card accessibilityLabel="Ver mis trabajos contratados" onPress={() => router.push('/(app)/bookings' as never)} style={styles.bookings}>
        <IconBubble name="briefcase" shape="square" size={44} variant="soft" />
        <Text style={styles.bookingsLabel}>Ver mis trabajos contratados</Text>
        <Icon color={ui.accent} name="chevron-right" size={24} />
      </Card>

      {ready ? (
        <View style={styles.countRow}>
          <Text style={styles.count}>
            {totalCount} solicitud{totalCount === 1 ? '' : 'es'}
            {activeFilter ? ` · ${activeFilter.label.toLowerCase()}: ${visibleItems.length}` : ''}
          </Text>
          {activeFilter ? (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setStatusFilter(null)} style={({ pressed }) => [styles.clearFilter, pressed && styles.pressed]}>
              <Text style={styles.clearFilterLabel}>Ver todas</Text>
              <Icon color={ui.accent} name="chevron-right" size={20} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {ready && activeFilter && hasMore ? <Text style={styles.filterNote}>El filtro se aplica a las {items.length} solicitudes cargadas.</Text> : null}

      {loading && items.length === 0 ? (
        <Card style={styles.stateCard}>
          <ActivityIndicator color={ui.accent} />
          <Text style={styles.muted}>Cargando solicitudes…</Text>
        </Card>
      ) : null}
      {failure ? (
        <Card style={styles.feedback}>
          <ErrorMessage>{failure}</ErrorMessage>
          <PillButton label="Reintentar" icon="refresh" onPress={() => void load(perspective, 0, true)} />
        </Card>
      ) : null}
      {ready && items.length === 0 ? (
        <Card style={styles.stateCard}>
          <IconBubble name="briefcase" size={64} variant="soft" />
          <Text style={styles.emptyTitle}>{perspective === 'customer' ? 'Aún no enviaste solicitudes' : 'Aún no recibiste solicitudes'}</Text>
          <Text style={styles.muted}>{perspective === 'customer'
            ? 'Explora profesionales aprobados y solicita uno de sus servicios activos.'
            : 'Las solicitudes dirigidas a tu perfil profesional aparecerán aquí.'}</Text>
          {perspective === 'customer' ? <PillButton chevron label="Explorar profesionales" onPress={() => router.push('/(app)/explore' as never)} /> : null}
        </Card>
      ) : null}
      {ready && activeFilter && items.length > 0 && visibleItems.length === 0 ? (
        <Card style={styles.stateCard}>
          <IconBubble name={activeFilter.icon} size={56} variant="grey" />
          <Text style={styles.muted}>No hay solicitudes {activeFilter.label.toLowerCase()} entre las cargadas.</Text>
          <PillButton label="Ver todas" size="sm" variant="outline" onPress={() => setStatusFilter(null)} />
        </Card>
      ) : null}

      <View style={styles.list}>
        {visibleItems.map((item) => <RequestCard key={item.request_id} item={item} />)}
      </View>
      {pageFailure ? (
        <View style={styles.feedback}>
          <ErrorMessage>{pageFailure}</ErrorMessage>
          <PillButton label="Reintentar página" variant="outline" onPress={() => void load(perspective, items.length, false)} />
        </View>
      ) : null}
      {hasMore ? <PillButton label="Cargar más" variant="outline" loading={loadingPage} onPress={() => void load(perspective, items.length, false)} /> : null}
    </Screen>
  );
}

function PerspectiveButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.switchButton, active && styles.switchActive, pressed && styles.pressed]}>
      <Text numberOfLines={1} style={[styles.switchLabel, active && styles.switchLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function FilterPill({ active, count, label, onPress }: { active: boolean; count: number; icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={`${label}, ${count}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.filterPill, pressed && styles.pressed]}
    >
      <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={[styles.filterLabel, active && styles.filterLabelActive]}>{label}</Text>
      <View style={[styles.filterCount, active && styles.filterCountActive]}>
        <Text style={[styles.filterCountLabel, active && styles.filterCountLabelActive]}>{count}</Text>
      </View>
    </Pressable>
  );
}

function RequestCard({ item }: { item: ServiceRequestListItem }) {
  const open = () => router.push({ pathname: '/(app)/request/[requestId]', params: { requestId: item.request_id } } as never);
  const roleLabel = item.perspective === 'customer' ? 'Profesional' : 'Cliente';
  return (
    <Card
      accessibilityLabel={`${item.service_title}, ${serviceRequestStatusLabels[item.status]}. ${roleLabel}: ${item.counterpart_display_name}. Ver detalle`}
      onPress={open}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View style={styles.serviceIcon}><Icon color={ui.accent} name={glyphForText(item.service_title)} size={36} /></View>
        <View style={styles.cardCopy}>
          <View style={styles.titleRow}>
            <Text numberOfLines={2} style={styles.service}>{item.service_title}</Text>
            <RequestStatusPill status={item.status} />
          </View>
          {item.counterpart_display_name ? (
            <View style={styles.counterpart}>
              <Avatar name={item.counterpart_display_name} size={36} />
              <View style={styles.counterpartCopy}>
                <Text style={styles.counterpartRole}>{roleLabel}</Text>
                <Text numberOfLines={1} style={styles.counterpartName}>{item.counterpart_display_name}</Text>
              </View>
            </View>
          ) : null}
          <Text numberOfLines={2} style={styles.description}>{item.description}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.metaColumn}>
          <View style={styles.metaRow}>
            <Icon color={ui.muted} name="calendar-blank" size={22} />
            <View style={styles.metaCopy}>
              <Text style={styles.metaStrong}>{formatRequestDate(item.preferred_date)}</Text>
              {item.preferred_time ? <Text style={styles.meta}>{item.preferred_time}</Text> : null}
            </View>
          </View>
          <View style={styles.metaRow}>
            <Icon color={ui.muted} name="map-marker" size={22} />
            <View style={styles.metaCopy}>
              <Text numberOfLines={2} style={styles.metaStrong}>{item.job_area_label}</Text>
            </View>
          </View>
        </View>
        <View importantForAccessibility="no-hide-descendants" style={styles.detailButton}><Text style={styles.detailLabel}>Ver detalle</Text><Icon color={ui.white} name="chevron-right" size={18} /></View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16, paddingTop: 20 },
  pressed: { opacity: 0.8 },
  switcher: { flexDirection: 'row', padding: 4, borderRadius: uiRadii.pill, backgroundColor: ui.headerButton },
  switchButton: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: uiRadii.pill, paddingHorizontal: 8 },
  switchActive: { backgroundColor: ui.white },
  switchLabel: { color: ui.headerText, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  switchLabelActive: { color: ui.navy, fontWeight: '700' },
  filters: { flexDirection: 'row', gap: 6, marginHorizontal: -10 },
  filterPill: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 6, borderRadius: uiRadii.pill, backgroundColor: ui.white, ...shadows.card },
  filterLabel: { flexShrink: 1, color: ui.inkSoft, fontSize: 13, lineHeight: 17, fontWeight: '500' },
  filterLabelActive: { color: ui.accent, fontWeight: '700' },
  filterCount: { minWidth: 22, height: 22, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: ui.tag },
  filterCountActive: { backgroundColor: ui.accent },
  filterCountLabel: { color: ui.muted, fontSize: 12, lineHeight: 15, fontWeight: '700' },
  filterCountLabelActive: { color: ui.white },
  bookings: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  bookingsLabel: { flex: 1, color: ui.ink, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  countRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  count: { flexShrink: 1, color: ui.muted, fontSize: 14, lineHeight: 19 },
  clearFilter: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  clearFilterLabel: { color: ui.accent, fontSize: 14, fontWeight: '600' },
  filterNote: { marginTop: -8, color: ui.muted, fontSize: 13, lineHeight: 18 },
  stateCard: { minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  feedback: { gap: 12 },
  emptyTitle: { color: ui.ink, fontSize: 19, lineHeight: 25, fontWeight: '700', textAlign: 'center' },
  muted: { color: ui.muted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  list: { gap: 14 },
  card: { gap: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  serviceIcon: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: uiRadii.lg, backgroundColor: ui.accentSoft },
  cardCopy: { flex: 1, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  service: { flexShrink: 1, flexGrow: 1, flexBasis: 120, color: ui.ink, fontSize: 18, lineHeight: 23, fontWeight: '700' },
  counterpart: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterpartCopy: { flex: 1 },
  counterpartRole: { color: ui.muted, fontSize: 12, lineHeight: 16 },
  counterpartName: { color: ui.ink, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  description: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  metaColumn: { flex: 1, gap: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  metaCopy: { flex: 1 },
  metaStrong: { color: ui.ink, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  meta: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  detailButton: { alignSelf: 'flex-end', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16, paddingRight: 12, borderRadius: uiRadii.pill, backgroundColor: ui.accent },
  detailLabel: { color: ui.white, fontSize: 15, lineHeight: 20, fontWeight: '600' },
});
