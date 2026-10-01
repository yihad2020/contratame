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
import { bookingFailureMessage } from '@/modules/booking/booking-errors';
import {
  bookingStatusLabels,
  formatBookingAmount,
  formatBookingDateTime,
  mergeBookingPages,
} from '@/modules/booking/booking-model';
import { listMyBookings } from '@/modules/booking/booking-service';
import type { BookingListItem, BookingStatus } from '@/modules/booking/types';
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
      header={<MarketplaceHeader back={() => router.back()} eyebrow="SOLICITUDES" title="Mis trabajos" subtitle="Contrataciones programadas y su estado actual." />}
    >
      <View accessibilityRole="tablist" style={styles.switcher}>
        <PerspectiveButton active={perspective === 'customer'} label="Como cliente" onPress={() => changePerspective('customer')} />
        <PerspectiveButton active={perspective === 'worker'} label="Como profesional" onPress={() => changePerspective('worker')} />
      </View>
      {!loading && !failure ? <Text style={styles.count}>{totalCount} trabajo{totalCount === 1 ? '' : 's'}</Text> : null}
      {loading && items.length === 0 ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Cargando trabajos…</Text></View> : null}
      {failure ? <View style={styles.feedback}><ErrorMessage>{failure}</ErrorMessage><AppButton label="Reintentar" onPress={() => void load(perspective, 0, true)} /></View> : null}
      {!loading && !failure && items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><AppIcon name="briefcase" color={colors.primary} size={sizing.iconLg} /></View>
          <Text style={styles.emptyTitle}>Aún no tienes trabajos contratados</Text>
          <Text style={styles.muted}>Aparecerán aquí después de aceptar una cotización.</Text>
        </View>
      ) : null}
      <View style={styles.list}>{items.map((item) => <BookingCard key={item.booking_id} item={item} />)}</View>
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

function BookingCard({ item }: { item: BookingListItem }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/(app)/booking/[bookingId]', params: { bookingId: item.booking_id } } as never)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardCopy}>
          <Text style={styles.service}>{item.service_title}</Text>
          <Text style={styles.counterpart}>{item.perspective === 'customer' ? 'Profesional' : 'Cliente'}: {item.counterpart_display_name}</Text>
        </View>
        <StatusBadge label={bookingStatusLabels[item.booking_status]} tone={statusTone(item.booking_status)} />
      </View>
      <Text style={styles.price}>{formatBookingAmount(item.agreed_price_bob)}</Text>
      <View style={styles.metaRow}><AppIcon name="time" color={colors.textSecondary} size={sizing.iconSm} /><Text style={styles.meta}>{formatBookingDateTime(item.scheduled_at)}</Text></View>
      <View style={styles.openRow}><Text style={styles.openLabel}>Ver trabajo</Text><AppIcon name="chevronRight" size={sizing.iconSm} /></View>
    </Pressable>
  );
}

function statusTone(status: BookingStatus): 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  return 'warning';
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
  price: { color: colors.success, ...typography.bodyStrong },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flex: 1, color: colors.textSecondary, ...typography.caption },
  openRow: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  openLabel: { color: colors.primary, ...typography.label },
});
