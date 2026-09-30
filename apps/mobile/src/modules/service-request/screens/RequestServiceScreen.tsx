import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { FormField } from '@/components/ui/FormField';
import { FormSection } from '@/components/ui/FormSection';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { formatMarketplacePrice } from '@/modules/marketplace/validation';
import { publicWorkerFailureMessage } from '@/modules/public-worker/public-worker-errors';
import { normalizePublicWorkerId } from '@/modules/public-worker/public-worker-model';
import { loadPublicWorkerRequestContext } from '@/modules/public-worker/public-worker-service';
import type { PublicWorkerProfile } from '@/modules/public-worker/types';
import { RequestLocationPicker } from '@/modules/service-request/components/RequestLocationPicker';
import { serviceRequestFailureMessage } from '@/modules/service-request/service-request-errors';
import { validateServiceRequest } from '@/modules/service-request/service-request-model';
import { createServiceRequest } from '@/modules/service-request/service-request-service';
import type { RequestCoordinate, ValidatedServiceRequest } from '@/modules/service-request/types';

const SANTA_CRUZ = { latitude: -17.7833, longitude: -63.1821 };

type ContextState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; profile: PublicWorkerProfile };

export function RequestServiceScreen({ workerIdParam }: { workerIdParam: string | string[] | undefined }) {
  const workerId = normalizePublicWorkerId(workerIdParam);
  const [context, setContext] = useState<ContextState>(workerId ? { kind: 'loading' } : { kind: 'unavailable' });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!workerId) return;
    let current = true;
    void loadPublicWorkerRequestContext(workerId)
      .then((profile) => {
        if (current) setContext(profile ? { kind: 'ready', profile } : { kind: 'unavailable' });
      })
      .catch((cause) => {
        if (current) setContext({ kind: 'error', message: publicWorkerFailureMessage(cause) });
      });
    return () => { current = false; };
  }, [retry, workerId]);

  return (
    <Screen
      contentStyle={styles.screen}
      footer={<MarketplaceNav active="explore" />}
      header={<MarketplaceHeader back={() => router.back()} eyebrow="SOLICITUD DIRECTA" title="Solicitar servicio" subtitle="Envía los detalles al profesional elegido." />}
    >
      {context.kind === 'loading' ? <LoadingContext /> : null}
      {context.kind === 'unavailable' ? <UnavailableContext /> : null}
      {context.kind === 'error' ? <View style={styles.stateCard}><ErrorMessage>{context.message}</ErrorMessage><AppButton label="Reintentar" onPress={() => { setContext({ kind: 'loading' }); setRetry((value) => value + 1); }} /></View> : null}
      {context.kind === 'ready' ? <RequestForm key={context.profile.worker_id} profile={context.profile} /> : null}
    </Screen>
  );
}

function LoadingContext() {
  return <View accessibilityRole="progressbar" style={styles.stateCard}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Comprobando servicios disponibles…</Text></View>;
}

function UnavailableContext() {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>No se puede crear la solicitud</Text>
      <Text style={styles.muted}>El profesional ya no está disponible o el enlace no es válido.</Text>
      <AppButton label="Volver a Explorar" variant="secondary" onPress={() => router.replace('/(app)/explore' as never)} />
    </View>
  );
}

function RequestForm({ profile }: { profile: PublicWorkerProfile }) {
  const [phase, setPhase] = useState<'form' | 'review' | 'success'>('form');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [budgetText, setBudgetText] = useState('');
  const [jobAreaLabel, setJobAreaLabel] = useState('');
  const [addressText, setAddressText] = useState('');
  const [mapCoordinate, setMapCoordinate] = useState<RequestCoordinate>(SANTA_CRUZ);
  const [location, setLocation] = useState<RequestCoordinate | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [validated, setValidated] = useState<ValidatedServiceRequest | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const locatingRef = useRef(false);
  const submittingRef = useRef(false);
  const geocodeRequest = useRef(0);

  const selectedService = profile.services.find((service) => service.service_id === selectedServiceId) ?? null;

  function clearError(key: string) {
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFailure(null);
  }

  async function chooseLocation(next: RequestCoordinate) {
    setMapCoordinate(next);
    setLocation(next);
    clearError('location');
    const request = ++geocodeRequest.current;
    setNotice(null);
    try {
      const result = (await Location.reverseGeocodeAsync(next))[0];
      if (request !== geocodeRequest.current) return;
      if (!result) {
        setNotice('La ubicación quedó marcada. Completa manualmente la zona y, si quieres, la dirección.');
        return;
      }
      const area = result.district || result.subregion || result.city || result.name;
      const address = [result.street, result.streetNumber].filter(Boolean).join(' ');
      if (area) setJobAreaLabel(area);
      if (address) setAddressText(address);
    } catch (cause) {
      if (__DEV__) console.warn('[MOD-06] reverse geocode unavailable', cause);
      if (request === geocodeRequest.current) {
        setNotice('La ubicación quedó marcada. Completa manualmente la zona y, si quieres, la dirección.');
      }
    }
  }

  async function selectCurrentLocation() {
    if (locatingRef.current) return;
    locatingRef.current = true;
    setLocating(true);
    setNotice(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setNotice('No diste permiso de ubicación. Puedes marcar el lugar manualmente en el mapa.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await chooseLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } catch (cause) {
      setNotice(serviceRequestFailureMessage(cause));
    } finally {
      locatingRef.current = false;
      setLocating(false);
    }
  }

  function review() {
    const checked = validateServiceRequest({
      workerId: profile.worker_id,
      workerServices: profile.services,
      selectedServiceId,
      description,
      preferredDate,
      preferredTime,
      budgetText,
      jobAreaLabel,
      addressText,
      location,
    });
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setFailure(null);
    setValidated(checked.value);
    setPhase('review');
  }

  async function submit() {
    if (!validated || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFailure(null);
    try {
      const created = await createServiceRequest(validated);
      setCreatedId(created.request_id);
      setPhase('success');
    } catch (cause) {
      setFailure(serviceRequestFailureMessage(cause));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (phase === 'success' && createdId) {
    return (
      <View style={styles.successCard}>
        <View style={styles.successIcon}><AppIcon name="check" color={colors.success} size={sizing.iconLg} /></View>
        <Text style={styles.stateTitle}>Solicitud enviada</Text>
        <Text style={styles.muted}>El profesional ya puede verla. Su estado inicial es Pendiente.</Text>
        <AppButton label="Ver solicitud" onPress={() => router.replace({ pathname: '/(app)/request/[requestId]', params: { requestId: createdId } } as never)} />
        <AppButton label="Ir a Mis solicitudes" variant="secondary" onPress={() => router.replace('/(app)/requests' as never)} />
      </View>
    );
  }

  if (phase === 'review' && validated && selectedService) {
    return (
      <View style={styles.reviewStack}>
        <FeedbackMessage tone="info">Revisa los datos. Al enviar se creará una solicitud directa para este profesional.</FeedbackMessage>
        <ReviewRow label="Profesional" value={profile.display_name} />
        <ReviewRow label="Servicio" value={selectedService.title} />
        <ReviewRow label="Detalle" value={validated.description} />
        <ReviewRow label="Zona visible al profesional" value={validated.jobAreaLabel} />
        <ReviewRow label="Ubicación exacta" value="Registrada de forma privada" />
        {validated.addressText ? <ReviewRow label="Dirección privada" value={validated.addressText} /> : null}
        <ReviewRow label="Fecha preferida" value={validated.preferredDate ?? 'Por acordar'} />
        <ReviewRow label="Hora preferida" value={validated.preferredTime ?? 'Por acordar'} />
        <ReviewRow label="Presupuesto de referencia" value={validated.budgetReferenceBob === null ? 'No indicado' : `Bs ${validated.budgetReferenceBob}`} />
        {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
        <AppButton label="Enviar solicitud" icon="send" loading={submitting} onPress={() => void submit()} />
        <AppButton label="Editar datos" variant="secondary" disabled={submitting} onPress={() => { setFailure(null); setPhase('form'); }} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.workerCard}>
        <Text style={styles.overline}>PROFESIONAL SELECCIONADO</Text>
        <Text style={styles.workerName}>{profile.display_name}</Text>
        <Text style={styles.muted}>{profile.public_area_label}, {profile.city}</Text>
      </View>

      <FormSection label="Servicio">
        <Text style={styles.help}>Elige uno de los servicios activos de este profesional.</Text>
        {profile.services.map((service) => {
          const selected = service.service_id === selectedServiceId;
          return (
            <Pressable
              key={service.service_id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => { setSelectedServiceId(service.service_id); clearError('service'); }}
              style={({ pressed }) => [styles.serviceChoice, selected && styles.serviceSelected, pressed && styles.pressed]}
            >
              <View style={styles.serviceCopy}>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <Text style={styles.muted}>{service.category_name} · {formatMarketplacePrice(service.pricing_type, service.price_bob)}</Text>
              </View>
              {selected ? <AppIcon name="check" color={colors.primary} size={sizing.iconMd} /> : null}
            </Pressable>
          );
        })}
        {errors.service ? <Text accessibilityRole="alert" style={styles.error}>{errors.service}</Text> : null}
      </FormSection>

      <FormSection label="Trabajo">
        <FormField
          label="Descripción o detalles"
          multiline
          maxLength={2000}
          value={description}
          onChangeText={(value) => { setDescription(value); clearError('description'); }}
          error={errors.description}
          helperText="Explica qué necesitas. Máximo 2000 caracteres."
          placeholder="Ej. Necesito revisar el tablero y dos enchufes."
        />
        <FormField
          label="Fecha preferida (opcional)"
          value={preferredDate}
          onChangeText={(value) => { setPreferredDate(value); clearError('preferredDate'); }}
          error={errors.preferredDate}
          helperText="Formato AAAA-MM-DD. La coordinación definitiva llegará en módulos posteriores."
          placeholder="2026-10-15"
        />
        <FormField
          label="Hora preferida (opcional)"
          value={preferredTime}
          onChangeText={(value) => { setPreferredTime(value); clearError('preferredTime'); }}
          error={errors.preferredTime}
          helperText="Formato de 24 horas HH:MM."
          placeholder="10:30"
        />
        <FormField
          label="Presupuesto de referencia BOB (opcional)"
          keyboardType="decimal-pad"
          value={budgetText}
          onChangeText={(value) => { setBudgetText(value); clearError('budget'); }}
          error={errors.budget}
          placeholder="350"
        />
      </FormSection>

      <FormSection label="Lugar del trabajo">
        <Text style={styles.help}>El profesional verá la zona general. Las coordenadas y la dirección exacta permanecen privadas antes de un booking.</Text>
        <AppButton label="Usar mi ubicación actual" icon="location" variant="secondary" loading={locating} onPress={() => void selectCurrentLocation()} />
        {notice ? <FeedbackMessage tone="info">{notice}</FeedbackMessage> : null}
        <RequestLocationPicker key={`${mapCoordinate.latitude}:${mapCoordinate.longitude}:${location !== null}`} coordinate={mapCoordinate} selected={location !== null} onChange={(next) => void chooseLocation(next)} />
        {errors.location ? <Text accessibilityRole="alert" style={styles.error}>{errors.location}</Text> : null}
        <FormField
          label="Zona o referencia"
          maxLength={160}
          value={jobAreaLabel}
          onChangeText={(value) => { setJobAreaLabel(value); clearError('jobAreaLabel'); }}
          error={errors.jobAreaLabel}
          placeholder="Ej. Equipetrol Norte"
        />
        <FormField
          label="Dirección exacta (opcional)"
          maxLength={300}
          value={addressText}
          onChangeText={(value) => { setAddressText(value); clearError('addressText'); }}
          error={errors.addressText}
          helperText="Dato privado; no se muestra al worker antes de una contratación."
          placeholder="Calle, número o referencia privada"
        />
      </FormSection>
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
      <AppButton label="Revisar solicitud" icon="chevronRight" disabled={locating} onPress={review} />
    </>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.reviewRow}><Text style={styles.reviewLabel}>{label}</Text><Text style={styles.reviewValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  stateCard: { minHeight: 220, gap: spacing.md, justifyContent: 'center', padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  stateTitle: { color: colors.navy, textAlign: 'center', ...typography.title },
  workerCard: { gap: spacing.xs, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  overline: { color: colors.textSecondary, ...typography.overline },
  workerName: { color: colors.navy, ...typography.title },
  help: { color: colors.textSecondary, ...typography.caption },
  muted: { color: colors.textSecondary, ...typography.body },
  serviceChoice: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  serviceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  serviceCopy: { flex: 1, gap: spacing.xs },
  serviceTitle: { color: colors.text, ...typography.bodyStrong },
  pressed: { opacity: 0.75 },
  error: { color: colors.danger, ...typography.caption },
  reviewStack: { gap: spacing.md },
  reviewRow: { gap: spacing.xs, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  reviewLabel: { color: colors.textSecondary, ...typography.caption },
  reviewValue: { color: colors.text, ...typography.bodyStrong },
  successCard: { minHeight: 360, gap: spacing.md, justifyContent: 'center', padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  successIcon: { width: 64, height: 64, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.successSoft },
});
