import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { reportFailureMessage } from '@/modules/report/report-errors';
import { mergeReportPages, oldestReportCursor, reportReasons, reportStatuses } from '@/modules/report/report-model';
import { listMyReports, REPORT_PAGE_SIZE } from '@/modules/report/report-service';
import type { UserReport } from '@/modules/report/types';

export function ReportsScreen() {
  const [items, setItems] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { const page = await listMyReports(null); setItems(page); setHasMore(page.length === REPORT_PAGE_SIZE); } catch (cause) { setError(reportFailureMessage(cause)); } finally { setLoading(false); } }, []);
  useEffect(() => {
    const initialLoad = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(initialLoad);
  }, [load]);

  async function more() {
    const cursor = oldestReportCursor(items); if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try { const page = await listMyReports(cursor); setItems((current) => mergeReportPages(current, page)); setHasMore(page.length === REPORT_PAGE_SIZE); }
    catch (cause) { setError(reportFailureMessage(cause)); }
    finally { setLoadingMore(false); }
  }

  return <Screen contentStyle={styles.screen} footer={<MarketplaceNav active="profile" />} header={<MarketplaceHeader back={() => router.back()} eyebrow="SEGURIDAD" title="Mis reportes" subtitle="Seguimiento privado de los reportes que enviaste." />}>
    {loading ? <View accessibilityRole="progressbar" style={styles.state}><ActivityIndicator color={colors.primary} /></View> : null}
    {!loading && error ? <View style={styles.state}><ErrorMessage>{error}</ErrorMessage><AppButton label="Reintentar" onPress={() => void load()} /></View> : null}
    {!loading && !error && !items.length ? <View style={styles.state}><AppIcon name="report" size={sizing.iconLg} /><Text style={styles.title}>No enviaste reportes</Text><Text style={styles.muted}>Puedes reportar desde un perfil profesional público o desde el detalle de una contratación.</Text></View> : null}
    {!error ? items.map((item) => <Pressable key={item.report_id} accessibilityRole="button" onPress={() => router.push({ pathname: '/(app)/report/[reportId]', params: { reportId: item.report_id } } as never)} style={styles.card}>
      <View style={styles.row}><View style={styles.copy}><Text style={styles.title}>{reportReasons[item.reason]}</Text><Text style={styles.muted}>{item.reported_display_name ?? 'Perfil ya no disponible'} · {item.context_type === 'booking' ? 'Contratación' : 'Perfil público'}</Text></View><StatusBadge label={reportStatuses[item.status]} tone={item.status === 'resolved' ? 'success' : item.status === 'dismissed' ? 'danger' : 'warning'} /></View>
      <Text numberOfLines={2} style={styles.description}>{item.description}</Text>
    </Pressable>) : null}
    {hasMore && !error ? <AppButton label="Cargar más" variant="secondary" loading={loadingMore} onPress={() => void more()} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md, paddingTop: spacing.xl }, state: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  card: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface }, row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, copy: { flex: 1, gap: spacing.xs },
  title: { color: colors.navy, ...typography.bodyStrong }, muted: { color: colors.textSecondary, ...typography.body }, description: { color: colors.text, ...typography.body },
});

