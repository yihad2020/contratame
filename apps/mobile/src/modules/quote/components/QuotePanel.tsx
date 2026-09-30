import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { quoteFailureMessage } from '@/modules/quote/quote-errors';
import {
  canAcceptQuote,
  currentQuote,
  formatQuoteAmount,
  prefillFinalSchedule,
  quoteStatusLabels,
  validateFinalSchedule,
  validateQuoteDraft,
} from '@/modules/quote/quote-model';
import {
  acceptServiceRequestQuote,
  createServiceRequestQuote,
  listMyServiceRequestQuotes,
} from '@/modules/quote/quote-service';
import type { QuoteRevision, QuoteStatus } from '@/modules/quote/types';
import type { ServiceRequestDetail } from '@/modules/service-request/types';

type QuotePanelProps = {
  detail: ServiceRequestDetail;
  onRequestChanged: () => void;
};

export function QuotePanel({ detail, onRequestChanged }: QuotePanelProps) {
  const [quotes, setQuotes] = useState<QuoteRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      setQuotes(await listMyServiceRequestQuotes(detail.request_id));
    } catch (cause) {
      setFailure(quoteFailureMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [detail.request_id]);

  useEffect(() => { void load(); }, [load, reloadKey]);

  const latest = currentQuote(quotes);
  const refreshAll = () => {
    setReloadKey((value) => value + 1);
    onRequestChanged();
  };

  return (
    <View style={styles.stack}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Cotizaciones</Text>
          <Text style={styles.muted}>Cada revisión permanece visible y no puede editarse.</Text>
        </View>
        {!loading ? <Text style={styles.count}>{quotes.length}</Text> : null}
      </View>

      {loading ? (
        <View accessibilityRole="progressbar" style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Cargando cotizaciones…</Text>
        </View>
      ) : null}
      {failure ? (
        <View style={styles.feedback}>
          <ErrorMessage>{failure}</ErrorMessage>
          <AppButton label="Reintentar cotizaciones" variant="secondary" onPress={() => setReloadKey((value) => value + 1)} />
        </View>
      ) : null}

      {!loading && !failure && detail.perspective === 'worker' ? (
        <WorkerQuoteComposer detail={detail} hasQuotes={quotes.length > 0} onCreated={refreshAll} />
      ) : null}

      {!loading && !failure && quotes.length === 0 ? (
        <FeedbackMessage tone="info">
          {detail.perspective === 'customer'
            ? 'El profesional todavía no envió una cotización.'
            : 'Aún no enviaste una cotización para esta solicitud.'}
        </FeedbackMessage>
      ) : null}

      {!loading && !failure && detail.perspective === 'customer' && latest ? (
        <CustomerAcceptance detail={detail} quote={latest} onAccepted={refreshAll} />
      ) : null}

      {!loading && !failure ? (
        <View style={styles.history}>
          {quotes.map((quote) => <QuoteCard key={quote.quote_id} quote={quote} />)}
        </View>
      ) : null}
    </View>
  );
}

function WorkerQuoteComposer({
  detail,
  hasQuotes,
  onCreated,
}: {
  detail: ServiceRequestDetail;
  hasQuotes: boolean;
  onCreated: () => void;
}) {
  const quotable = detail.status === 'pending' || detail.status === 'quoted';
  const [open, setOpen] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [message, setMessage] = useState('');
  const [validUntilDate, setValidUntilDate] = useState('');
  const [validUntilTime, setValidUntilTime] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  if (!quotable) {
    return <FeedbackMessage tone="info">Esta solicitud ya no admite nuevas cotizaciones.</FeedbackMessage>;
  }
  if (!open) {
    return (
      <AppButton
        label={hasQuotes ? 'Enviar nueva revisión' : 'Enviar cotización'}
        icon="send"
        onPress={() => setOpen(true)}
      />
    );
  }

  function clearError(...keys: string[]) {
    setErrors((current) => {
      const next = { ...current };
      keys.forEach((key) => delete next[key]);
      return next;
    });
    setFailure(null);
  }

  async function submit() {
    if (submittingRef.current) return;
    const checked = validateQuoteDraft({
      serviceRequestId: detail.request_id,
      amountText,
      message,
      validUntilDate,
      validUntilTime,
    });
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setErrors({});
    setFailure(null);
    try {
      await createServiceRequestQuote(checked.value);
      setOpen(false);
      setAmountText('');
      setMessage('');
      setValidUntilDate('');
      setValidUntilTime('');
      onCreated();
    } catch (cause) {
      setFailure(quoteFailureMessage(cause));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>{hasQuotes ? 'Nueva revisión' : 'Primera cotización'}</Text>
      {hasQuotes ? <FeedbackMessage tone="info">La revisión anterior quedará preservada como reemplazada.</FeedbackMessage> : null}
      <FormField
        label="Monto BOB"
        keyboardType="decimal-pad"
        value={amountText}
        onChangeText={(value) => { setAmountText(value); clearError('amount'); }}
        error={errors.amount}
        placeholder="350.00"
      />
      <FormField
        label="Propuesta o mensaje (opcional)"
        multiline
        value={message}
        onChangeText={(value) => { setMessage(value); clearError('message'); }}
        placeholder="Describe qué incluye la cotización."
      />
      <Text style={styles.helper}>La vigencia es opcional. Si la usas, completa fecha y hora en Bolivia.</Text>
      <FormField
        label="Válida hasta la fecha (opcional)"
        value={validUntilDate}
        onChangeText={(value) => { setValidUntilDate(value); clearError('validUntil', 'validUntilDate'); }}
        error={errors.validUntilDate}
        placeholder="2026-10-20"
      />
      <FormField
        label="Válida hasta la hora (opcional)"
        value={validUntilTime}
        onChangeText={(value) => { setValidUntilTime(value); clearError('validUntil', 'validUntilTime'); }}
        error={errors.validUntilTime ?? errors.validUntil}
        placeholder="18:00"
      />
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
      <AppButton label={hasQuotes ? 'Enviar revisión' : 'Enviar cotización'} loading={submitting} onPress={() => void submit()} />
      <AppButton label="Cancelar" variant="secondary" disabled={submitting} onPress={() => { setFailure(null); setErrors({}); setOpen(false); }} />
    </View>
  );
}

function CustomerAcceptance({
  detail,
  quote,
  onAccepted,
}: {
  detail: ServiceRequestDetail;
  quote: QuoteRevision;
  onAccepted: () => void;
}) {
  const eligible = canAcceptQuote({ perspective: detail.perspective, requestStatus: detail.status, quote });
  const [confirming, setConfirming] = useState(false);
  const initialSchedule = prefillFinalSchedule(detail.preferred_date, detail.preferred_time);
  const [date, setDate] = useState(initialSchedule.date);
  const [time, setTime] = useState(initialSchedule.time);
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const schedule = validateFinalSchedule({ date, time });

  if (quote.quote_status === 'accepted' && quote.booking_id && quote.scheduled_at) {
    return (
      <FeedbackMessage tone="success">
        Cotización aceptada. La contratación quedó programada para {formatScheduledAt(quote.scheduled_at)}.
      </FeedbackMessage>
    );
  }
  if (!eligible) {
    return <FeedbackMessage tone="info">La revisión actual no está disponible para aceptación.</FeedbackMessage>;
  }
  if (!confirming) {
    return (
      <AppButton
        label={`Aceptar cotización por ${formatQuoteAmount(quote.amount_bob)}`}
        icon="check"
        onPress={() => setConfirming(true)}
      />
    );
  }

  async function accept() {
    if (!schedule.ok || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFailure(null);
    try {
      await acceptServiceRequestQuote(quote.quote_id, schedule.value);
      onAccepted();
    } catch (cause) {
      setFailure(quoteFailureMessage(cause));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const scheduleErrors = schedule.ok ? {} : schedule.errors;
  return (
    <View style={styles.acceptCard}>
      <Text style={styles.cardTitle}>Confirmar cotización y horario final</Text>
      <Text style={styles.muted}>Las preferencias se precargan cuando existen. Puedes cambiarlas; el horario final se interpreta en America/La_Paz.</Text>
      <FormField
        label="Fecha definitiva"
        value={date}
        onChangeText={(value) => { setDate(value); setFailure(null); }}
        error={scheduleErrors.date}
        placeholder="2026-10-15"
      />
      <FormField
        label="Hora definitiva"
        value={time}
        onChangeText={(value) => { setTime(value); setFailure(null); }}
        error={scheduleErrors.time ?? scheduleErrors.schedule}
        placeholder="10:30"
      />
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
      <AppButton
        label={`Confirmar ${formatQuoteAmount(quote.amount_bob)} y horario`}
        loading={submitting}
        disabled={!schedule.ok}
        onPress={() => void accept()}
      />
      <AppButton label="Volver" variant="secondary" disabled={submitting} onPress={() => { setFailure(null); setConfirming(false); }} />
    </View>
  );
}

function QuoteCard({ quote }: { quote: QuoteRevision }) {
  const isExpiredPending = quote.quote_status === 'pending'
    && quote.valid_until !== null
    && new Date(quote.valid_until).getTime() <= Date.now();
  const visibleStatus: QuoteStatus = isExpiredPending ? 'expired' : quote.quote_status;
  return (
    <View style={[styles.quoteCard, quote.is_current && styles.currentCard]}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.cardTitle}>Revisión {quote.revision_number}</Text>
          <Text style={styles.amount}>{formatQuoteAmount(quote.amount_bob)}</Text>
        </View>
        <StatusBadge label={quoteStatusLabels[visibleStatus]} tone={statusTone(visibleStatus)} />
      </View>
      {quote.is_current ? <Text style={styles.currentLabel}>REVISIÓN ACTUAL</Text> : null}
      {quote.message ? <Text style={styles.message}>{quote.message}</Text> : <Text style={styles.muted}>Sin mensaje adicional.</Text>}
      <Text style={styles.meta}>Enviada {formatTimestamp(quote.created_at)}</Text>
      <Text style={styles.meta}>Vigencia: {quote.valid_until ? formatTimestamp(quote.valid_until) : 'sin vencimiento definido'}</Text>
      {quote.quote_status === 'accepted' && quote.scheduled_at ? (
        <Text style={styles.bookingMeta}>Programada: {formatScheduledAt(quote.scheduled_at)}</Text>
      ) : null}
    </View>
  );
}

function statusTone(status: QuoteStatus): 'success' | 'warning' | 'danger' {
  if (status === 'accepted') return 'success';
  if (status === 'pending') return 'warning';
  return 'danger';
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(new Date(value));
}

function formatScheduledAt(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headingCopy: { flex: 1, gap: spacing.xs },
  title: { color: colors.navy, ...typography.section },
  cardTitle: { color: colors.navy, ...typography.bodyStrong },
  muted: { color: colors.textSecondary, ...typography.body },
  helper: { color: colors.textSecondary, ...typography.caption },
  count: { minWidth: 32, color: colors.primary, textAlign: 'center', ...typography.bodyStrong },
  loading: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  feedback: { gap: spacing.md },
  formCard: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  acceptCard: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.primary, borderRadius: radii.xl, backgroundColor: colors.primarySoft },
  history: { gap: spacing.md },
  quoteCard: { gap: spacing.sm, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  currentCard: { borderColor: colors.primary },
  currentLabel: { color: colors.primary, ...typography.overline },
  amount: { color: colors.success, ...typography.title },
  message: { color: colors.text, ...typography.body },
  meta: { color: colors.textSecondary, ...typography.caption },
  bookingMeta: { color: colors.success, ...typography.label },
});
