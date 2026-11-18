import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon, glyphForText } from '@/components/ui/Icon';
import { Card, IconBubble } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { ui, uiRadii } from '@/constants/theme';
import { QuotePanel } from '@/modules/quote/components/QuotePanel';
import { RequestStatusPill } from '@/modules/service-request/components/RequestKit';
import { serviceRequestFailureMessage } from '@/modules/service-request/service-request-errors';
import {
  formatRequestDate,
  normalizeServiceRequestId,
} from '@/modules/service-request/service-request-model';
import { getMyServiceRequest } from '@/modules/service-request/service-request-service';
import type { ServiceRequestDetail } from '@/modules/service-request/types';

type DetailState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; detail: ServiceRequestDetail };

export function ServiceRequestDetailScreen({ requestIdParam }: { requestIdParam: string | string[] | undefined }) {
  const requestId = normalizeServiceRequestId(requestIdParam);
  const [state, setState] = useState<DetailState>(requestId ? { kind: 'loading' } : { kind: 'unavailable' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!requestId) return;
    let current = true;
    void getMyServiceRequest(requestId)
      .then((detail) => {
        if (current) setState(detail ? { kind: 'ready', detail } : { kind: 'unavailable' });
      })
      .catch((cause) => {
        if (current) setState({ kind: 'error', message: serviceRequestFailureMessage(cause) });
      });
    return () => { current = false; };
  }, [attempt, requestId]);

  return (
    <Screen
      contentStyle={styles.screen}
      footer={<MarketplaceNav active="requests" />}
      header={<MarketplaceHeader back={() => router.back()} eyebrow="SOLICITUD" title="Detalle" subtitle="Información vigente de la solicitud directa." />}
    >
      {state.kind === 'loading' ? (
        <Card style={styles.state}>
          <View accessibilityRole="progressbar" style={styles.stateInner}>
            <ActivityIndicator color={ui.accent} />
            <Text style={styles.muted}>Cargando solicitud…</Text>
          </View>
        </Card>
      ) : null}
      {state.kind === 'unavailable' ? <UnavailableDetail /> : null}
      {state.kind === 'error' ? (
        <Card style={styles.state}>
          <ErrorMessage>{state.message}</ErrorMessage>
          <PillButton label="Reintentar" icon="refresh" onPress={() => { setState({ kind: 'loading' }); setAttempt((value) => value + 1); }} />
        </Card>
      ) : null}
      {state.kind === 'ready' ? (
        <ReadyDetail detail={state.detail} onRequestChanged={() => setAttempt((value) => value + 1)} />
      ) : null}
    </Screen>
  );
}

function UnavailableDetail() {
  return (
    <Card style={styles.state}>
      <IconBubble name="text-box-remove" size={64} variant="grey" />
      <Text style={styles.stateTitle}>Solicitud no disponible</Text>
      <Text style={styles.muted}>No existe o no participas en esta solicitud.</Text>
      <PillButton label="Volver a Solicitudes" variant="outline" onPress={() => router.replace('/(app)/requests' as never)} />
    </Card>
  );
}

function ReadyDetail({ detail, onRequestChanged }: { detail: ServiceRequestDetail; onRequestChanged: () => void }) {
  const counterpart = detail.perspective === 'customer' ? detail.worker_display_name : detail.customer_display_name;
  return (
    <>
      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.serviceIcon}><Icon color={ui.accent} name={glyphForText(detail.service_title)} size={34} /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>{detail.service_title}</Text>
            <RequestStatusPill status={detail.status} />
          </View>
        </View>
        <View style={styles.counterpart}>
          <Avatar name={counterpart} size={40} />
          <View style={styles.heroCopy}>
            <Text style={styles.label}>{detail.perspective === 'customer' ? 'Profesional' : 'Cliente'}</Text>
            <Text style={styles.value}>{counterpart}</Text>
          </View>
        </View>
        <Text style={styles.timestamp}>Creada {new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(detail.created_at))}</Text>
      </Card>

      <DetailSection title="Trabajo">
        <DetailRow label="Descripción" value={detail.description} />
        <DetailRow label="Fecha preferida" value={formatRequestDate(detail.preferred_date)} />
        <DetailRow label="Hora preferida" value={detail.preferred_time ?? 'Por acordar'} />
        <DetailRow label="Presupuesto de referencia" value={detail.budget_reference_bob === null ? 'No indicado' : `Bs ${detail.budget_reference_bob}`} />
      </DetailSection>

      <DetailSection title="Ubicación">
        <DetailRow label="Zona del trabajo" value={detail.job_area_label} />
        {detail.perspective === 'customer' || (detail.exact_latitude !== null && detail.exact_longitude !== null) ? (
          <>
            <DetailRow label="Dirección exacta privada" value={detail.address_text ?? 'No indicada'} />
            <DetailRow label="Coordenadas privadas" value={detail.exact_latitude !== null && detail.exact_longitude !== null
              ? `${detail.exact_latitude.toFixed(5)}, ${detail.exact_longitude.toFixed(5)}`
              : 'No disponibles'} />
          </>
        ) : (
          <FeedbackMessage tone="info">Antes de una contratación puedes ver la zona general, pero no la dirección ni las coordenadas exactas.</FeedbackMessage>
        )}
      </DetailSection>

      {detail.booking_id ? (
        <DetailSection title="Trabajo contratado">
          <FeedbackMessage tone="success">La cotización fue aceptada y esta solicitud ya tiene un trabajo programado.</FeedbackMessage>
          <PillButton
            label="Ver trabajo"
            icon="briefcase"
            onPress={() => router.push({ pathname: '/(app)/booking/[bookingId]', params: { bookingId: detail.booking_id } } as never)}
          />
        </DetailSection>
      ) : null}

      <DetailSection title="Propuesta y contratación">
        <QuotePanel detail={detail} onRequestChanged={onRequestChanged} />
      </DetailSection>

      <DetailSection title="Conversación">
        <Text style={styles.value}>Coordina este servicio únicamente con la persona participante de la solicitud.</Text>
        <PillButton
          label="Abrir chat"
          icon="message-processing"
          onPress={() => router.push({ pathname: '/(app)/chat/request/[requestId]', params: { requestId: detail.request_id } } as never)}
        />
      </DetailSection>
    </>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card style={styles.section}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{children}</Card>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { gap: 16, paddingTop: 20 },
  state: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  stateInner: { alignItems: 'center', gap: 12 },
  stateTitle: { color: ui.ink, fontSize: 21, lineHeight: 27, fontWeight: '700', textAlign: 'center' },
  title: { color: ui.ink, fontSize: 21, lineHeight: 27, fontWeight: '700' },
  muted: { color: ui.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
  hero: { gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  serviceIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: uiRadii.lg, backgroundColor: ui.accentSoft },
  heroCopy: { flex: 1, gap: 6 },
  counterpart: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timestamp: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  section: { gap: 12 },
  sectionTitle: { color: ui.ink, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  row: { minHeight: 44, gap: 2, paddingTop: 12, borderTopWidth: 1, borderTopColor: ui.divider },
  label: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  value: { color: ui.ink, fontSize: 15, lineHeight: 21, fontWeight: '600' },
});
