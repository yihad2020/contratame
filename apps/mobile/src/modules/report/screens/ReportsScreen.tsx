import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Card, IconBubble, StatusPill } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage } from '@/components/ui/Typography';
import { ui } from '@/constants/theme';
import { reportFailureMessage } from '@/modules/report/report-errors';
import { mergeReportPages, oldestReportCursor, reportReasons, reportStatuses } from '@/modules/report/report-model';
import { listMyReports, REPORT_PAGE_SIZE } from '@/modules/report/report-service';
import { reportStatusIcon, reportStatusTone } from '@/modules/report/screens/report-status-ui';
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
    {loading ? <Card style={styles.state}><View accessibilityRole="progressbar"><ActivityIndicator color={ui.accent} /></View></Card> : null}
    {!loading && error ? <Card style={styles.stateGap}><ErrorMessage>{error}</ErrorMessage><PillButton label="Reintentar" icon="refresh" onPress={() => void load()} /></Card> : null}
    {!loading && !error && !items.length ? (
      <Card style={styles.state}>
        <IconBubble name="flag" variant="soft" size={68} />
        <Text style={[styles.title, styles.center]}>No enviaste reportes</Text>
        <Text style={[styles.muted, styles.center]}>Puedes reportar desde un perfil profesional público o desde el detalle de una contratación.</Text>
      </Card>
    ) : null}
    {!error ? items.map((item) => (
      <Card key={item.report_id} onPress={() => router.push({ pathname: '/(app)/report/[reportId]', params: { reportId: item.report_id } } as never)} style={styles.card}>
        <View style={styles.row}>
          <IconBubble name="flag" variant="soft" shape="square" size={52} iconSize={26} />
          <View style={styles.copy}>
            <Text style={styles.title}>{reportReasons[item.reason]}</Text>
            <Text style={styles.muted}>{item.reported_display_name ?? 'Perfil ya no disponible'} · {item.context_type === 'booking' ? 'Contratación' : 'Perfil público'}</Text>
          </View>
          <Icon color={ui.accent} name="chevron-right" size={24} />
        </View>
        <Text numberOfLines={2} style={styles.description}>{item.description}</Text>
        <StatusPill icon={reportStatusIcon(item.status)} label={reportStatuses[item.status]} tone={reportStatusTone(item.status)} />
      </Card>
    )) : null}
    {hasMore && !error ? <PillButton label="Cargar más" variant="outline" loading={loadingMore} onPress={() => void more()} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  screen: { gap: 14, paddingTop: 20 },
  state: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  stateGap: { gap: 14 },
  center: { textAlign: 'center' },
  card: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 2 },
  title: { color: ui.ink, fontSize: 17, lineHeight: 23, fontWeight: '700' },
  muted: { color: ui.muted, fontSize: 14, lineHeight: 20 },
  description: { color: ui.inkSoft, fontSize: 15, lineHeight: 21 },
});
