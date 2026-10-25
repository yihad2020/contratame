import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { reportFailureMessage } from '@/modules/report/report-errors';
import { normalizeReportId, reportReasons, reportStatuses } from '@/modules/report/report-model';
import { getMyReport } from '@/modules/report/report-service';
import type { UserReport } from '@/modules/report/types';

export function ReportDetailScreen({ reportIdParam }: { reportIdParam: string | string[] | undefined }) {
  const reportId = normalizeReportId(reportIdParam);
  const [item, setItem] = useState<UserReport | null>(null);
  const [loading, setLoading] = useState(Boolean(reportId));
  const [error, setError] = useState<string | null>(reportId ? null : 'El reporte no es válido.');
  useEffect(() => { if (!reportId) return; void getMyReport(reportId).then((value) => { setItem(value); if (!value) setError('El reporte no está disponible.'); }).catch((cause) => setError(reportFailureMessage(cause))).finally(() => setLoading(false)); }, [reportId]);
  return <Screen contentStyle={styles.screen} header={<MarketplaceHeader back={() => router.back()} eyebrow="REPORTE" title="Detalle del reporte" subtitle="La revisión administrativa es privada." />}>
    {loading ? <ActivityIndicator color={colors.primary} /> : null}
    {error ? <ErrorMessage>{error}</ErrorMessage> : null}
    {item ? <View style={styles.card}>
      <View style={styles.row}><Text style={styles.title}>{reportReasons[item.reason]}</Text><StatusBadge label={reportStatuses[item.status]} tone={item.status === 'resolved' ? 'success' : item.status === 'dismissed' ? 'danger' : 'warning'} /></View>
      <Text style={styles.label}>Contexto</Text><Text style={styles.value}>{item.context_type === 'booking' ? `Contratación ${item.booking_id}` : 'Perfil profesional público'}</Text>
      <Text style={styles.label}>Perfil reportado</Text><Text style={styles.value}>{item.reported_display_name ?? 'Ya no disponible públicamente'}</Text>
      <Text style={styles.label}>Descripción</Text><Text style={styles.value}>{item.description}</Text>
      <FeedbackMessage tone="info">No se muestran identidad ni notas internas del personal administrativo.</FeedbackMessage>
    </View> : null}
  </Screen>;
}

const styles = StyleSheet.create({ screen: { gap: spacing.lg, paddingTop: spacing.xl }, card: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }, title: { flex: 1, color: colors.navy, ...typography.section }, label: { color: colors.textSecondary, ...typography.caption }, value: { color: colors.text, ...typography.body } });

