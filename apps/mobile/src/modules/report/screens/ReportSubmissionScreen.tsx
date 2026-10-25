import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { reportFailureMessage } from '@/modules/report/report-errors';
import { allowedReportReasons, normalizeReportId, reportReasons, reportTextLength, validateReportInput } from '@/modules/report/report-model';
import { createBookingReport, createProfileReport } from '@/modules/report/report-service';
import type { ReportContext, ReportReason } from '@/modules/report/types';

export function ReportSubmissionScreen({ context, targetParam }: { context: ReportContext; targetParam: string | string[] | undefined }) {
  const targetId = normalizeReportId(targetParam);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const length = reportTextLength(description);

  async function submit() {
    if (busyRef.current || !targetId) return;
    const checked = validateReportInput(context, reason ?? '', description);
    if (!checked.ok) { setError(checked.error); return; }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      if (context === 'profile') await createProfileReport(targetId, checked.reason, checked.description);
      else await createBookingReport(targetId, checked.reason, checked.description);
      setSuccess(true);
    } catch (cause) {
      setError(reportFailureMessage(cause));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={styles.screen} header={<MarketplaceHeader back={() => router.back()} eyebrow="SEGURIDAD" title="Enviar reporte" subtitle={context === 'profile' ? 'Sobre información visible en el perfil profesional.' : 'Sobre una contratación en la que participaste.'} />}>
      {!targetId ? <ErrorMessage>El contexto del reporte no es válido.</ErrorMessage> : null}
      {success ? (
        <View style={styles.card}>
          <FeedbackMessage>Recibimos tu reporte. El equipo administrativo podrá revisarlo.</FeedbackMessage>
          <Text style={styles.copy}>El reporte no genera sanciones automáticas.</Text>
          <AppButton label="Ver mis reportes" onPress={() => router.replace('/(app)/reports' as never)} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.title}>Motivo</Text>
          <View style={styles.reasons}>{allowedReportReasons(context).map((value) => (
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: reason === value }} key={value} onPress={() => setReason(value)} style={[styles.reason, reason === value && styles.reasonSelected]}>
              <Text style={[styles.reasonText, reason === value && styles.reasonTextSelected]}>{reportReasons[value]}</Text>
            </Pressable>
          ))}</View>
          <FormField label="Descripción" multiline value={description} onChangeText={setDescription} placeholder="Explica con claridad qué ocurrió." helperText={`${length}/2.000 caracteres · mínimo 20`} />
          <Text style={styles.copy}>No incluyas contraseñas, datos bancarios ni información sensible innecesaria.</Text>
          {error ? <ErrorMessage>{error}</ErrorMessage> : null}
          <AppButton label="Enviar reporte" icon="send" loading={busy} disabled={!targetId || !reason || length < 20 || length > 2000} onPress={() => void submit()} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  card: { gap: spacing.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  title: { color: colors.navy, ...typography.section },
  copy: { color: colors.textSecondary, ...typography.body },
  reasons: { gap: spacing.sm },
  reason: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.md },
  reasonSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  reasonText: { color: colors.text, ...typography.body },
  reasonTextSelected: { color: colors.primary, fontWeight: '700' },
});

