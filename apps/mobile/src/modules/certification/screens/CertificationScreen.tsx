import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { certificationFailureMessage } from '@/modules/certification/certification-errors';
import {
  CERTIFICATION_VALIDITY_MONTHS,
  certificationStateLabels,
  formatCertificationDate,
  formatCertificationPrice,
} from '@/modules/certification/certification-model';
import { loadOwnCertificationState, requestCertification } from '@/modules/certification/certification-service';
import type { CertificationState } from '@/modules/certification/types';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; value: CertificationState };

export function CertificationScreen() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    void loadOwnCertificationState()
      .then((value) => setState({ kind: 'ready', value }))
      .catch((cause) => setState({ kind: 'error', message: certificationFailureMessage(cause) }));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    setSubmitting(true);
    setFeedback(null);
    try {
      const value = await requestCertification();
      setState({ kind: 'ready', value });
      setFeedback('Tu solicitud fue registrada para verificación manual por Contrátame.');
    } catch (cause) {
      setState((current) => current.kind === 'ready' ? current : { kind: 'error', message: certificationFailureMessage(cause) });
      setFeedback(certificationFailureMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      contentStyle={styles.screen}
      header={<MarketplaceHeader back={() => router.back()} eyebrow="MI TRABAJO" title="Verificación profesional" subtitle="Certificación opcional administrada por Contrátame." />}
    >
      <View style={styles.explanation}>
        <View style={styles.icon}><AppIcon color={colors.success} name="check" size={sizing.iconLg} /></View>
        <View style={styles.copy}>
          <Text style={styles.title}>Verificación de Contrátame</Text>
          <Text style={styles.body}>Confirma que Contrátame revisó tu solicitud. No garantiza la calidad futura de los servicios.</Text>
        </View>
        <View style={styles.facts}>
          <Text style={styles.fact}>Precio: {formatCertificationPrice(50)}</Text>
          <Text style={styles.fact}>Vigencia: {CERTIFICATION_VALIDITY_MONTHS} meses desde la aprobación</Text>
          <Text style={styles.fact}>Pago y verificación: proceso administrativo manual</Text>
        </View>
      </View>

      {state.kind === 'loading' ? <View style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.body}>Consultando tu estado…</Text></View> : null}
      {state.kind === 'error' ? <View style={styles.state}><ErrorMessage>{state.message}</ErrorMessage><AppButton label="Reintentar" onPress={load} /></View> : null}
      {state.kind === 'ready' ? <CertificationStateCard state={state.value} submitting={submitting} submit={() => void submit()} /> : null}
      {feedback ? feedback.includes('registrada') ? <FeedbackMessage>{feedback}</FeedbackMessage> : <ErrorMessage>{feedback}</ErrorMessage> : null}
    </Screen>
  );
}

function CertificationStateCard({ state, submitting, submit }: { state: CertificationState; submitting: boolean; submit: () => void }) {
  const expiresOn = formatCertificationDate(state.expires_at);
  const copy = {
    not_eligible: 'Necesitas un perfil profesional aprobado para solicitar la certificación.',
    eligible: 'Tu perfil está aprobado y puedes iniciar la verificación.',
    pending: 'Tu solicitud está pendiente de verificación administrativa manual.',
    active: `Tu verificación está activa${expiresOn ? ` hasta el ${expiresOn}` : ''}.`,
    rejected: 'La solicitud no fue aprobada. El modelo actual no almacena un motivo de rechazo. Puedes volver a solicitarla.',
    expired: 'La certificación venció. Puedes solicitar una nueva verificación.',
  }[state.display_state];
  const tone: 'success' | 'warning' | 'danger' = state.display_state === 'active' ? 'success'
    : state.display_state === 'rejected' ? 'danger'
      : 'warning';

  return <View style={styles.state}>
    <View style={styles.stateHeader}><Text style={styles.stateTitle}>Estado actual</Text><StatusBadge label={certificationStateLabels[state.display_state]} tone={tone} /></View>
    <Text style={styles.body}>{copy}</Text>
    {state.starts_at ? <Text style={styles.meta}>Inicio: {formatCertificationDate(state.starts_at)}</Text> : null}
    {state.expires_at ? <Text style={styles.meta}>Vencimiento: {expiresOn}</Text> : null}
    {state.can_request ? <AppButton label="Solicitar certificación" loading={submitting} onPress={submit} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  explanation: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  icon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.successSoft },
  copy: { gap: spacing.xs },
  title: { color: colors.navy, ...typography.title },
  body: { color: colors.textSecondary, ...typography.body },
  facts: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  fact: { color: colors.text, ...typography.label },
  state: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  stateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  stateTitle: { color: colors.navy, ...typography.section },
  meta: { color: colors.textSecondary, ...typography.caption },
});

