import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Card, IconBubble, SectionTitle, StatusPill, type StatusTone } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { ui } from '@/constants/theme';
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
      <Card style={styles.explanation}>
        <View style={styles.introRow}>
          <IconBubble name="check-decagram" variant="soft" size={60} />
          <View style={styles.copy}>
            <Text style={styles.title}>Verificación de Contrátame</Text>
            <Text style={styles.body}>Confirma que Contrátame revisó tu solicitud. No garantiza la calidad futura de los servicios.</Text>
          </View>
        </View>
        <View style={styles.facts}>
          <Fact icon="cash" text={`Precio: ${formatCertificationPrice(50)}`} />
          <Fact icon="calendar-clock" text={`Vigencia: ${CERTIFICATION_VALIDITY_MONTHS} meses desde la aprobación`} />
          <Fact icon="clipboard-check" text="Pago y verificación: proceso administrativo manual" />
        </View>
      </Card>

      {state.kind === 'loading' ? <Card style={styles.loading}><ActivityIndicator color={ui.accent} /><Text style={styles.body}>Consultando tu estado…</Text></Card> : null}
      {state.kind === 'error' ? <Card style={styles.state}><ErrorMessage>{state.message}</ErrorMessage><PillButton label="Reintentar" icon="refresh" onPress={load} /></Card> : null}
      {state.kind === 'ready' ? <CertificationStateCard state={state.value} submitting={submitting} submit={() => void submit()} /> : null}
      {feedback ? feedback.includes('registrada') ? <FeedbackMessage>{feedback}</FeedbackMessage> : <ErrorMessage>{feedback}</ErrorMessage> : null}
    </Screen>
  );
}

function Fact({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.factRow}>
      <IconBubble name={icon} variant="grey" shape="square" size={38} iconSize={20} />
      <Text style={styles.fact}>{text}</Text>
    </View>
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
  const tone: StatusTone = state.display_state === 'active' ? 'success'
    : state.display_state === 'rejected' ? 'danger'
      : state.display_state === 'expired' || state.display_state === 'not_eligible' ? 'neutral'
        : 'accent';
  const icon: IconName = state.display_state === 'active' ? 'check-decagram'
    : state.display_state === 'rejected' ? 'close-circle'
      : state.display_state === 'pending' ? 'clock-time-four'
        : 'information';

  return <View style={styles.block}>
    <SectionTitle title="Estado actual" />
    <Card style={styles.state}>
      <StatusPill icon={icon} label={certificationStateLabels[state.display_state]} tone={tone} />
      <Text style={styles.stateBody}>{copy}</Text>
      {state.starts_at || state.expires_at ? (
        <View style={styles.dates}>
          {state.starts_at ? <View style={styles.dateRow}><Icon color={ui.muted} name="calendar-start" size={20} /><Text style={styles.meta}>Inicio: {formatCertificationDate(state.starts_at)}</Text></View> : null}
          {state.expires_at ? <View style={styles.dateRow}><Icon color={ui.muted} name="calendar-end" size={20} /><Text style={styles.meta}>Vencimiento: {expiresOn}</Text></View> : null}
        </View>
      ) : null}
      {state.can_request ? <PillButton label="Solicitar certificación" icon="check-decagram" loading={submitting} onPress={submit} /> : null}
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  screen: { gap: 16, paddingTop: 20 },
  explanation: { gap: 16 },
  introRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  copy: { flex: 1, gap: 4 },
  title: { color: ui.ink, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  body: { color: ui.muted, fontSize: 15, lineHeight: 21 },
  facts: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: ui.divider },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fact: { flex: 1, color: ui.ink, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  loading: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 12 },
  block: { gap: 8 },
  state: { gap: 14 },
  stateBody: { color: ui.inkSoft, fontSize: 15, lineHeight: 21 },
  dates: { gap: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { color: ui.muted, fontSize: 14, lineHeight: 19 },
});
