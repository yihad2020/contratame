import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { QuotePanel } from '@/modules/quote/components/QuotePanel';
import { serviceRequestFailureMessage } from '@/modules/service-request/service-request-errors';
import {
  formatRequestDate,
  normalizeServiceRequestId,
  serviceRequestStatusLabels,
} from '@/modules/service-request/service-request-model';
import { getMyServiceRequest } from '@/modules/service-request/service-request-service';
import type { ServiceRequestDetail, ServiceRequestStatus } from '@/modules/service-request/types';

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
      {state.kind === 'loading' ? <View accessibilityRole="progressbar" style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Cargando solicitud…</Text></View> : null}
      {state.kind === 'unavailable' ? <UnavailableDetail /> : null}
      {state.kind === 'error' ? <View style={styles.state}><ErrorMessage>{state.message}</ErrorMessage><AppButton label="Reintentar" onPress={() => { setState({ kind: 'loading' }); setAttempt((value) => value + 1); }} /></View> : null}
      {state.kind === 'ready' ? (
        <ReadyDetail detail={state.detail} onRequestChanged={() => setAttempt((value) => value + 1)} />
      ) : null}
    </Screen>
  );
}

function UnavailableDetail() {
  return (
    <View style={styles.state}>
      <Text style={styles.title}>Solicitud no disponible</Text>
      <Text style={styles.muted}>No existe o no participas en esta solicitud.</Text>
      <AppButton label="Volver a Solicitudes" variant="secondary" onPress={() => router.replace('/(app)/requests' as never)} />
    </View>
  );
}

function ReadyDetail({ detail, onRequestChanged }: { detail: ServiceRequestDetail; onRequestChanged: () => void }) {
  const counterpart = detail.perspective === 'customer' ? detail.worker_display_name : detail.customer_display_name;
  return (
    <>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>{detail.service_title}</Text>
            <Text style={styles.counterpart}>{detail.perspective === 'customer' ? 'Profesional' : 'Cliente'}: {counterpart}</Text>
          </View>
          <StatusBadge label={serviceRequestStatusLabels[detail.status]} tone={statusTone(detail.status)} />
        </View>
        <Text style={styles.timestamp}>Creada {new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(detail.created_at))}</Text>
      </View>

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

      <DetailSection title="Propuesta y contratación">
        <QuotePanel detail={detail} onRequestChanged={onRequestChanged} />
      </DetailSection>
    </>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

function statusTone(status: ServiceRequestStatus): 'success' | 'warning' | 'danger' {
  if (status === 'pending') return 'warning';
  if (status === 'quoted' || status === 'accepted') return 'success';
  return 'danger';
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  state: { minHeight: 240, gap: spacing.md, justifyContent: 'center', padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  title: { color: colors.navy, ...typography.title },
  muted: { color: colors.textSecondary, textAlign: 'center', ...typography.body },
  hero: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  heroCopy: { flex: 1, gap: spacing.xs },
  counterpart: { color: colors.primary, ...typography.label },
  timestamp: { color: colors.textSecondary, ...typography.caption },
  section: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  sectionTitle: { color: colors.navy, ...typography.section },
  row: { minHeight: sizing.touchTarget, gap: spacing.xs, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  label: { color: colors.textSecondary, ...typography.caption },
  value: { color: colors.text, ...typography.bodyStrong },
});
