import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Card, IconBubble, StatusPill } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { ui } from '@/constants/theme';
import { reportFailureMessage } from '@/modules/report/report-errors';
import { normalizeReportId, reportReasons, reportStatuses } from '@/modules/report/report-model';
import { getMyReport } from '@/modules/report/report-service';
import { reportStatusIcon, reportStatusTone } from '@/modules/report/screens/report-status-ui';
import type { UserReport } from '@/modules/report/types';

export function ReportDetailScreen({ reportIdParam }: { reportIdParam: string | string[] | undefined }) {
  const reportId = normalizeReportId(reportIdParam);
  const [item, setItem] = useState<UserReport | null>(null);
  const [loading, setLoading] = useState(Boolean(reportId));
  const [error, setError] = useState<string | null>(reportId ? null : 'El reporte no es válido.');
  useEffect(() => { if (!reportId) return; void getMyReport(reportId).then((value) => { setItem(value); if (!value) setError('El reporte no está disponible.'); }).catch((cause) => setError(reportFailureMessage(cause))).finally(() => setLoading(false)); }, [reportId]);
  return <Screen contentStyle={styles.screen} header={<MarketplaceHeader back={() => router.back()} eyebrow="REPORTE" title="Detalle del reporte" subtitle="La revisión administrativa es privada." />}>
    {loading ? <Card style={styles.state}><ActivityIndicator color={ui.accent} /></Card> : null}
    {error ? <ErrorMessage>{error}</ErrorMessage> : null}
    {item ? <Card style={styles.card}>
      <View style={styles.row}>
        <IconBubble name="flag" variant="soft" shape="square" size={56} iconSize={28} />
        <View style={styles.headCopy}>
          <Text style={styles.title}>{reportReasons[item.reason]}</Text>
          <StatusPill icon={reportStatusIcon(item.status)} label={reportStatuses[item.status]} tone={reportStatusTone(item.status)} />
        </View>
      </View>
      <View style={styles.divider} />
      <DetailRow icon={item.context_type === 'booking' ? 'briefcase' : 'account-box'} label="Contexto" value={item.context_type === 'booking' ? `Contratación ${item.booking_id}` : 'Perfil profesional público'} />
      <DetailRow icon="account" label="Perfil reportado" value={item.reported_display_name ?? 'Ya no disponible públicamente'} />
      <DetailRow icon="text-box" label="Descripción" value={item.description} />
      <FeedbackMessage tone="info">No se muestran identidad ni notas internas del personal administrativo.</FeedbackMessage>
    </Card> : null}
  </Screen>;
}

function DetailRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Icon color={ui.muted} name={icon} size={22} />
      <View style={styles.flex}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16, paddingTop: 20 },
  flex: { flex: 1 },
  state: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  card: { gap: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  headCopy: { flex: 1, gap: 8 },
  title: { color: ui.ink, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  divider: { height: 1, backgroundColor: ui.divider },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  label: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  value: { color: ui.ink, fontSize: 15, lineHeight: 21 },
});
