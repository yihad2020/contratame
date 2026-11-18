import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon, glyphForText, type IconName } from '@/components/ui/Icon';
import { Card, IconBubble, StatusPill } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage } from '@/components/ui/Typography';
import { ui, uiRadii } from '@/constants/theme';
import { bookingFailureMessage } from '@/modules/booking/booking-errors';
import {
  bookingStatusLabels,
  formatBookingAmount,
  formatBookingDateTime,
  mergeBookingPages,
} from '@/modules/booking/booking-model';
import { listMyBookings } from '@/modules/booking/booking-service';
import { bookingStatusIcon, bookingStatusTone } from '@/modules/booking/screens/booking-status-ui';
import type { BookingListItem } from '@/modules/booking/types';
import type { ServiceRequestPerspective } from '@/modules/service-request/types';

export function BookingsScreen() {
  const [perspective, setPerspective] = useState<ServiceRequestPerspective>('customer');
  const [items, setItems] = useState<BookingListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pageFailure, setPageFailure] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (currentPerspective: ServiceRequestPerspective, offset: number, reset: boolean) => {
    const request = ++requestRef.current;
    if (reset) { setLoading(true); setFailure(null); } else { setLoadingPage(true); setPageFailure(null); }
    try {
      const next = await listMyBookings(currentPerspective, offset);
      if (request !== requestRef.current) return;
      setItems((current) => reset ? next : mergeBookingPages(current, next));
      setTotalCount((current) => next[0]?.total_count ?? (reset ? 0 : current));
    } catch (cause) {
      if (request !== requestRef.current) return;
      const message = bookingFailureMessage(cause);
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
      header={(
        <MarketplaceHeader back={() => router.back()} eyebrow="SOLICITUDES" title="Mis trabajos" subtitle="Contrataciones programadas y su estado actual.">
          <View accessibilityRole="tablist" style={styles.switcher}>
            <PerspectiveButton active={perspective === 'customer'} icon="account" label="Como cliente" onPress={() => changePerspective('customer')} />
            <PerspectiveButton active={perspective === 'worker'} icon="briefcase" label="Como profesional" onPress={() => changePerspective('worker')} />
          </View>
        </MarketplaceHeader>
      )}
    >
      {!loading && !failure ? <Text style={styles.count}>{totalCount} trabajo{totalCount === 1 ? '' : 's'}</Text> : null}
      {loading && items.length === 0 ? <Card style={styles.loading}><ActivityIndicator color={ui.accent} /><Text style={styles.muted}>Cargando trabajos…</Text></Card> : null}
      {failure ? <Card style={styles.feedback}><ErrorMessage>{failure}</ErrorMessage><PillButton label="Reintentar" icon="refresh" onPress={() => void load(perspective, 0, true)} /></Card> : null}
      {!loading && !failure && items.length === 0 ? (
        <Card style={styles.empty}>
          <View style={styles.emptyIcon}><IconBubble name="briefcase" variant="soft" size={68} /></View>
          <Text style={styles.emptyTitle}>Aún no tienes trabajos contratados</Text>
          <Text style={styles.muted}>Aparecerán aquí después de aceptar una cotización.</Text>
        </Card>
      ) : null}
      <View style={styles.list}>{items.map((item) => <BookingCard key={item.booking_id} item={item} />)}</View>
      {pageFailure ? <View style={styles.feedback}><ErrorMessage>{pageFailure}</ErrorMessage><PillButton label="Reintentar página" variant="outline" icon="refresh" onPress={() => void load(perspective, items.length, false)} /></View> : null}
      {hasMore ? <PillButton label="Cargar más" variant="outline" loading={loadingPage} onPress={() => void load(perspective, items.length, false)} /> : null}
    </Screen>
  );
}

function PerspectiveButton({ active, label, icon, onPress }: { active: boolean; label: string; icon: IconName; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.switchButton, active && styles.switchActive, pressed && styles.pressed]}>
      <Icon color={active ? ui.accent : ui.white} name={icon} size={20} />
      <Text numberOfLines={1} style={[styles.switchLabel, active && styles.switchLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function BookingCard({ item }: { item: BookingListItem }) {
  return (
    <Card
      onPress={() => router.push({ pathname: '/(app)/booking/[bookingId]', params: { bookingId: item.booking_id } } as never)}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <IconBubble name={glyphForText(item.service_title)} variant="soft" shape="square" size={64} iconSize={34} />
        <View style={styles.cardCopy}>
          <Text style={styles.service}>{item.service_title}</Text>
          <View style={styles.counterpartRow}>
            <Avatar name={item.counterpart_display_name} size={38} />
            <View style={styles.counterpartCopy}>
              <Text style={styles.counterpartRole}>{item.perspective === 'customer' ? 'Profesional' : 'Cliente'}</Text>
              <Text numberOfLines={1} style={styles.counterpart}>{item.counterpart_display_name}</Text>
            </View>
          </View>
        </View>
      </View>
      <StatusPill icon={bookingStatusIcon(item.booking_status)} label={bookingStatusLabels[item.booking_status]} tone={bookingStatusTone(item.booking_status)} />
      <View style={styles.cardBottom}>
        <View style={styles.metaBlock}>
          <View style={styles.metaRow}><Icon color={ui.muted} name="calendar-month" size={22} /><Text style={styles.meta}>{formatBookingDateTime(item.scheduled_at)}</Text></View>
          <View style={styles.metaRow}><Icon color={ui.muted} name="cash" size={22} /><Text style={styles.price}>{formatBookingAmount(item.agreed_price_bob)}</Text></View>
        </View>
        <View style={styles.openPill}><Text style={styles.openLabel}>Ver trabajo</Text><Icon color={ui.white} name="chevron-right" size={20} /></View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16, paddingTop: 20 },
  switcher: { flexDirection: 'row', gap: 10 },
  switchButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, borderRadius: uiRadii.pill, backgroundColor: ui.headerButton },
  switchActive: { backgroundColor: ui.white },
  switchLabel: { flexShrink: 1, color: ui.white, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  switchLabelActive: { color: ui.accent, fontWeight: '700' },
  count: { color: ui.muted, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 },
  feedback: { gap: 12 },
  empty: { minHeight: 260, gap: 12, justifyContent: 'center', padding: 24 },
  emptyIcon: { alignSelf: 'center' },
  emptyTitle: { color: ui.ink, textAlign: 'center', fontSize: 19, lineHeight: 25, fontWeight: '700' },
  muted: { color: ui.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
  list: { gap: 14 },
  card: { gap: 14 },
  pressed: { opacity: 0.8 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  cardCopy: { flex: 1, gap: 8 },
  service: { color: ui.ink, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  counterpartRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterpartCopy: { flex: 1 },
  counterpartRole: { color: ui.muted, fontSize: 12, lineHeight: 16 },
  counterpart: { color: ui.ink, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  metaBlock: { flex: 1, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { flex: 1, color: ui.inkSoft, fontSize: 14, lineHeight: 19, fontWeight: '500' },
  price: { flex: 1, color: ui.greenText, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  openPill: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 18, paddingRight: 12, borderRadius: uiRadii.pill, backgroundColor: ui.accent },
  openLabel: { color: ui.white, fontSize: 15, lineHeight: 20, fontWeight: '700' },
});
