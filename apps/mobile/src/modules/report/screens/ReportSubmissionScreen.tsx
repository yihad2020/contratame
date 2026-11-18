import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/ui/FormField';
import { Icon } from '@/components/ui/Icon';
import { Card, IconBubble, SectionTitle } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { ui, uiRadii } from '@/constants/theme';
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
        <Card style={styles.card}>
          <View style={styles.centered}><IconBubble name="check-circle" variant="soft" size={68} /></View>
          <FeedbackMessage>Recibimos tu reporte. El equipo administrativo podrá revisarlo.</FeedbackMessage>
          <Text style={styles.copy}>El reporte no genera sanciones automáticas.</Text>
          <PillButton label="Ver mis reportes" chevron onPress={() => router.replace('/(app)/reports' as never)} />
        </Card>
      ) : (
        <>
          <View style={styles.block}>
            <SectionTitle title="Motivo" />
            <Card style={styles.reasons}>{allowedReportReasons(context).map((value) => {
              const selected = reason === value;
              return (
                <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} key={value} onPress={() => setReason(value)} style={({ pressed }) => [styles.reason, selected && styles.reasonSelected, pressed && styles.pressed]}>
                  <Icon color={selected ? ui.accent : ui.subtle} name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={24} />
                  <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>{reportReasons[value]}</Text>
                </Pressable>
              );
            })}</Card>
          </View>
          <View style={styles.block}>
            <SectionTitle title="Detalle" />
            <Card style={styles.card}>
              <FormField label="Descripción" multiline value={description} onChangeText={setDescription} placeholder="Explica con claridad qué ocurrió." helperText={`${length}/2.000 caracteres · mínimo 20`} />
              <View style={styles.hint}>
                <Icon color={ui.accent} name="shield-lock" size={20} />
                <Text style={styles.hintText}>No incluyas contraseñas, datos bancarios ni información sensible innecesaria.</Text>
              </View>
            </Card>
          </View>
          {error ? <ErrorMessage>{error}</ErrorMessage> : null}
          <PillButton label="Enviar reporte" icon="send" size="lg" loading={busy} disabled={!targetId || !reason || length < 20 || length > 2000} onPress={() => void submit()} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16, paddingTop: 20 },
  block: { gap: 8 },
  card: { gap: 16 },
  centered: { alignSelf: 'center' },
  copy: { color: ui.muted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  reasons: { gap: 10, padding: 12 },
  reason: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: ui.divider, borderRadius: uiRadii.lg, backgroundColor: ui.card },
  reasonSelected: { borderColor: ui.accent, backgroundColor: ui.accentTint },
  pressed: { opacity: 0.8 },
  reasonText: { flex: 1, color: ui.ink, fontSize: 15, lineHeight: 21 },
  reasonTextSelected: { color: ui.accent, fontWeight: '700' },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: uiRadii.md, backgroundColor: ui.accentTint },
  hintText: { flex: 1, color: ui.inkSoft, fontSize: 14, lineHeight: 20 },
});
