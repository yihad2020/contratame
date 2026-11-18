import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon, categoryGlyph, type IconName } from '@/components/ui/Icon';
import { Card, IconBubble, StepProgress } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { shadows, sizing, ui, uiRadii } from '@/constants/theme';
import { formatMarketplacePrice } from '@/modules/marketplace/validation';
import { publicWorkerFailureMessage } from '@/modules/public-worker/public-worker-errors';
import { normalizePublicWorkerId } from '@/modules/public-worker/public-worker-model';
import { loadPublicWorkerRequestContext } from '@/modules/public-worker/public-worker-service';
import type { PublicWorkerProfile, PublicWorkerService } from '@/modules/public-worker/types';
import { RequestLocationPicker } from '@/modules/service-request/components/RequestLocationPicker';
import { RequestField } from '@/modules/service-request/components/RequestKit';
import { serviceRequestFailureMessage } from '@/modules/service-request/service-request-errors';
import { validateServiceRequest } from '@/modules/service-request/service-request-model';
import { createServiceRequest } from '@/modules/service-request/service-request-service';
import type { RequestCoordinate, ValidatedServiceRequest } from '@/modules/service-request/types';

const SANTA_CRUZ = { latitude: -17.7833, longitude: -63.1821 };
/** Matches the validator limit in `validateServiceRequest`. */
const DESCRIPTION_MAX = 2000;
/** Required inputs tracked by the header progress: service, description, exact location, area label. */
const REQUIRED_STEPS = 4;
const TILE_GAP = 10;

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

  if (context.kind === 'ready') return <RequestForm key={context.profile.worker_id} profile={context.profile} />;

  return (
    <RequestFrame footer={<MarketplaceNav active="explore" />}>
      {context.kind === 'loading' ? <LoadingContext /> : null}
      {context.kind === 'unavailable' ? <UnavailableContext /> : null}
      {context.kind === 'error' ? (
        <Card style={styles.stateCard}>
          <ErrorMessage>{context.message}</ErrorMessage>
          <PillButton label="Reintentar" icon="refresh" onPress={() => { setContext({ kind: 'loading' }); setRetry((value) => value + 1); }} />
        </Card>
      ) : null}
    </RequestFrame>
  );
}

/** Screen shell shared by every state: navy header with back button, wordmark and title. */
function RequestFrame({ children, footer, progress }: PropsWithChildren<{ footer: ReactNode; progress?: number }>) {
  return (
    <Screen
      contentStyle={styles.screen}
      footer={footer}
      header={(
        <MarketplaceHeader
          back={() => router.back()}
          brand
          subtitle="Cuéntanos qué servicio necesitas"
          title="Nueva solicitud"
          trailing={progress === undefined ? undefined : <StepProgress current={progress} total={REQUIRED_STEPS} />}
        />
      )}
    >
      {children}
    </Screen>
  );
}

function LoadingContext() {
  return (
    <Card style={styles.stateCard}>
      <View accessibilityRole="progressbar" style={styles.stateInner}>
        <ActivityIndicator color={ui.accent} />
        <Text style={styles.stateText}>Comprobando servicios disponibles…</Text>
      </View>
    </Card>
  );
}

function UnavailableContext() {
  return (
    <Card style={styles.stateCard}>
      <IconBubble name="account-off" size={64} variant="grey" />
      <Text style={styles.stateTitle}>No se puede crear la solicitud</Text>
      <Text style={styles.stateText}>El profesional ya no está disponible o el enlace no es válido.</Text>
      <PillButton label="Volver a Explorar" variant="outline" onPress={() => router.replace('/(app)/explore' as never)} />
    </Card>
  );
}

function localIsoDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
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
  const { width } = useWindowDimensions();

  const selectedService = profile.services.find((service) => service.service_id === selectedServiceId) ?? null;
  const contentWidth = Math.max(0, Math.min(width, sizing.screenMaxWidth) - sizing.screenPadding * 2);
  const tileWidth = Math.floor((contentWidth - TILE_GAP * 2) / 3);
  const today = localIsoDate(0);
  const tomorrow = localIsoDate(1);
  const completedSteps = [
    selectedService !== null,
    description.trim().length > 0,
    location !== null,
    jobAreaLabel.trim().length > 0,
  ].filter(Boolean).length;

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
      <RequestFrame footer={<MarketplaceNav active="explore" />}>
        <Card style={styles.successCard}>
          <View style={styles.successIcon}><Icon color={ui.green} name="check-circle" size={40} /></View>
          <Text style={styles.stateTitle}>Solicitud enviada</Text>
          <Text style={styles.stateText}>El profesional ya puede verla. Su estado inicial es Pendiente.</Text>
          <PillButton chevron label="Ver solicitud" size="lg" style={styles.fullWidth} onPress={() => router.replace({ pathname: '/(app)/request/[requestId]', params: { requestId: createdId } } as never)} />
          <PillButton label="Ir a Mis solicitudes" variant="outline" style={styles.fullWidth} onPress={() => router.replace('/(app)/requests' as never)} />
        </Card>
      </RequestFrame>
    );
  }

  if (phase === 'review' && validated && selectedService) {
    return (
      <RequestFrame
        footer={(
          <RequestFooter
            actionLabel="Enviar solicitud"
            budgetLabel={validated.budgetReferenceBob === null ? null : `Bs ${validated.budgetReferenceBob}`}
            failure={failure}
            loading={submitting}
            onPress={() => void submit()}
          />
        )}
        progress={REQUIRED_STEPS}
      >
        <FeedbackMessage tone="info">Revisa los datos. Al enviar se creará una solicitud directa para este profesional.</FeedbackMessage>
        <Card style={styles.reviewCard}>
          <ReviewRow first icon="account" label="Profesional" value={profile.display_name} />
          <ReviewRow icon={categoryGlyph(selectedService.category_icon_key, selectedService.category_slug).name} label="Servicio" value={selectedService.title} />
          <ReviewRow icon="text-box" label="Detalle" value={validated.description} />
          <ReviewRow icon="map-marker" label="Zona visible al profesional" value={validated.jobAreaLabel} />
          <ReviewRow icon="lock" label="Ubicación exacta" value="Registrada de forma privada" />
          {validated.addressText ? <ReviewRow icon="home" label="Dirección privada" value={validated.addressText} /> : null}
          <ReviewRow icon="calendar-blank" label="Fecha preferida" value={validated.preferredDate ?? 'Por acordar'} />
          <ReviewRow icon="clock-time-four" label="Hora preferida" value={validated.preferredTime ?? 'Por acordar'} />
          <ReviewRow icon="database" label="Presupuesto de referencia" value={validated.budgetReferenceBob === null ? 'No indicado' : `Bs ${validated.budgetReferenceBob}`} />
        </Card>
        <PillButton icon="pencil" label="Editar datos" variant="outline" disabled={submitting} onPress={() => { setFailure(null); setPhase('form'); }} />
      </RequestFrame>
    );
  }

  return (
    <RequestFrame
      footer={(
        <RequestFooter
          actionLabel="Revisar solicitud"
          budgetLabel={budgetText.trim() ? `Bs ${budgetText.trim()}` : null}
          disabled={locating}
          failure={failure}
          onPress={review}
        />
      )}
      progress={completedSteps}
    >
      <Card style={styles.workerCard}>
        <Avatar badge={profile.is_verified ? 'verified' : undefined} name={profile.display_name} size={56} />
        <View style={styles.workerCopy}>
          <Text style={styles.overline}>Profesional seleccionado</Text>
          <Text numberOfLines={2} style={styles.workerName}>{profile.display_name}</Text>
          <View style={styles.inlineMeta}>
            <Icon color={ui.muted} name="map-marker" size={16} />
            <Text numberOfLines={1} style={styles.workerArea}>{profile.public_area_label}, {profile.city}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeading title="1. Selecciona un servicio" />
        <Text style={styles.help}>Elige uno de los servicios activos de este profesional.</Text>
        <View accessibilityRole="radiogroup" style={styles.tiles}>
          {profile.services.map((service) => (
            <ServiceTile
              key={service.service_id}
              selected={service.service_id === selectedServiceId}
              service={service}
              width={tileWidth}
              onPress={() => { setSelectedServiceId(service.service_id); clearError('service'); }}
            />
          ))}
        </View>
        {errors.service ? <Text accessibilityRole="alert" style={styles.error}>{errors.service}</Text> : null}
      </View>

      <View style={styles.section}>
        <SectionHeading title="2. Describe lo que necesitas" />
        <RequestField
          counterMax={DESCRIPTION_MAX}
          error={errors.description}
          helperText="Explica qué necesitas. Máximo 2000 caracteres."
          hideLabel
          label="Descripción o detalles"
          maxLength={DESCRIPTION_MAX}
          multiline
          placeholder="Ej. Necesito revisar el tablero y dos enchufes."
          value={description}
          onChangeText={(value) => { setDescription(value); clearError('description'); }}
        />
      </View>

      <View style={styles.section}>
        <SectionHeading title="3. ¿Dónde necesitas el servicio?" />
        <Text style={styles.help}>El profesional verá la zona general. Las coordenadas y la dirección exacta permanecen privadas antes de un booking.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: locating, busy: locating }}
          disabled={locating}
          onPress={() => void selectCurrentLocation()}
          style={({ pressed }) => [styles.locationRow, pressed && styles.pressed]}
        >
          <Icon color={ui.accent} name="map-marker" size={30} />
          <View style={styles.locationCopy}>
            <Text style={styles.locationTitle}>Usar mi ubicación actual</Text>
            <Text numberOfLines={1} style={styles.locationMeta}>{location ? (jobAreaLabel.trim() || 'Ubicación marcada') : 'O marca el lugar en el mapa'}</Text>
          </View>
          {locating ? <ActivityIndicator color={ui.accent} /> : <Icon color={ui.ink} name="chevron-right" size={26} />}
        </Pressable>
        {notice ? <FeedbackMessage tone="info">{notice}</FeedbackMessage> : null}
        <RequestLocationPicker key={`${mapCoordinate.latitude}:${mapCoordinate.longitude}:${location !== null}`} coordinate={mapCoordinate} selected={location !== null} onChange={(next) => void chooseLocation(next)} />
        {errors.location ? <Text accessibilityRole="alert" style={styles.error}>{errors.location}</Text> : null}
        <RequestField
          error={errors.jobAreaLabel}
          label="Zona o referencia"
          maxLength={160}
          placeholder="Ej. Equipetrol Norte"
          value={jobAreaLabel}
          onChangeText={(value) => { setJobAreaLabel(value); clearError('jobAreaLabel'); }}
        />
        <RequestField
          error={errors.addressText}
          helperText="Dato privado; no se muestra al worker antes de una contratación."
          label="Dirección exacta (opcional)"
          maxLength={300}
          placeholder="Calle, número o referencia privada"
          value={addressText}
          onChangeText={(value) => { setAddressText(value); clearError('addressText'); }}
        />
      </View>

      <View style={styles.section}>
        <SectionHeading title="4. ¿Cuándo lo necesitas?" />
        <View style={styles.chips}>
          <DateChip label="Hoy" selected={preferredDate.trim() === today} onPress={() => { setPreferredDate(today); clearError('preferredDate'); }} />
          <DateChip label="Mañana" selected={preferredDate.trim() === tomorrow} onPress={() => { setPreferredDate(tomorrow); clearError('preferredDate'); }} />
        </View>
        <RequestField
          error={errors.preferredDate}
          helperText="Formato AAAA-MM-DD. La coordinación definitiva llegará en módulos posteriores."
          label="Fecha preferida (opcional)"
          placeholder="2026-10-15"
          value={preferredDate}
          onChangeText={(value) => { setPreferredDate(value); clearError('preferredDate'); }}
        />
        <RequestField
          error={errors.preferredTime}
          helperText="Formato de 24 horas HH:MM."
          label="Hora preferida (opcional)"
          placeholder="10:30"
          value={preferredTime}
          onChangeText={(value) => { setPreferredTime(value); clearError('preferredTime'); }}
        />
      </View>

      <View style={styles.section}>
        <SectionHeading title="5. Presupuesto de referencia" />
        <RequestField
          error={errors.budget}
          helperText="Opcional. Es solo una referencia para el profesional."
          keyboardType="decimal-pad"
          label="Presupuesto de referencia BOB (opcional)"
          placeholder="350"
          value={budgetText}
          onChangeText={(value) => { setBudgetText(value); clearError('budget'); }}
        />
      </View>
    </RequestFrame>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>;
}


function ServiceTile({ service, selected, width, onPress }: { service: PublicWorkerService; selected: boolean; width: number; onPress: () => void }) {
  const glyph = categoryGlyph(service.category_icon_key, service.category_slug);
  const price = formatMarketplacePrice(service.pricing_type, service.price_bob);
  return (
    <Pressable
      accessibilityLabel={`${service.title}. ${service.category_name} · ${price}`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { width }, selected && styles.tileSelected, pressed && styles.pressed]}
    >
      {selected ? <View style={styles.tileCheck}><Icon color={ui.accent} name="check-circle" size={18} /></View> : null}
      <Icon color={glyph.color} name={glyph.name} size={36} />
      <Text numberOfLines={2} style={styles.tileTitle}>{service.title}</Text>
      <Text numberOfLines={2} style={styles.tileMeta}>{price}</Text>
    </Pressable>
  );
}

function DateChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={`Fecha preferida: ${label}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      <Icon color={selected ? ui.accent : ui.ink} name="calendar-blank" size={22} />
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Sticky bottom card: the user's own budget reference (never an estimate) and the primary action. */
function RequestFooter({ actionLabel, budgetLabel, failure, loading = false, disabled = false, onPress }: {
  actionLabel: string;
  budgetLabel: string | null;
  failure: string | null;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.footer}>
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
      <View style={styles.footerCard}>
        <Icon color={ui.accent} name="database" size={28} />
        <View style={styles.footerCopy}>
          <Text style={styles.footerLabel}>Presupuesto estimado</Text>
          <Text numberOfLines={1} style={[styles.footerValue, !budgetLabel && styles.footerValueEmpty]}>{budgetLabel ?? 'Sin indicar'}</Text>
          <Text numberOfLines={1} style={styles.footerMeta}>{budgetLabel ? 'Monto que indicaste' : 'Opcional'}</Text>
        </View>
        <View style={styles.footerDivider} />
        <PillButton chevron disabled={disabled} label={actionLabel} loading={loading} onPress={onPress} />
      </View>
      <View style={styles.footerNote}>
        <Icon color={ui.muted} name="shield-check" size={18} />
        <Text style={styles.footerNoteLabel}>Tu solicitud será visible solo para este profesional</Text>
      </View>
    </View>
  );
}

function ReviewRow({ label, value, icon, first = false }: { label: string; value: string; icon: IconName; first?: boolean }) {
  return (
    <View style={[styles.reviewRow, !first && styles.reviewDivider]}>
      <IconBubble name={icon} shape="square" size={36} variant="soft" />
      <View style={styles.reviewCopy}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 22, paddingTop: 20 },
  pressed: { opacity: 0.8 },
  fullWidth: { alignSelf: 'stretch' },
  stateCard: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  stateInner: { alignItems: 'center', gap: 12 },
  stateTitle: { color: ui.ink, fontSize: 21, lineHeight: 27, fontWeight: '700', textAlign: 'center' },
  stateText: { color: ui.muted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  workerCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  workerCopy: { flex: 1, gap: 2 },
  overline: { color: ui.muted, fontSize: 13, lineHeight: 17, fontWeight: '600' },
  workerName: { color: ui.ink, fontSize: 18, lineHeight: 23, fontWeight: '700' },
  inlineMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  workerArea: { flex: 1, color: ui.muted, fontSize: 14, lineHeight: 19 },
  section: { gap: 12 },
  sectionTitle: { color: ui.ink, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  help: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  error: { color: ui.danger, fontSize: 13, lineHeight: 18 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },
  tile: { minHeight: 118, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: 12, borderRadius: uiRadii.lg, borderWidth: 2, borderColor: ui.card, backgroundColor: ui.card, ...shadows.card },
  tileSelected: { borderColor: ui.accent, backgroundColor: ui.accentTint },
  tileCheck: { position: 'absolute', top: 6, right: 6 },
  tileTitle: { color: ui.ink, fontSize: 13, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  tileMeta: { color: ui.muted, fontSize: 11, lineHeight: 14, textAlign: 'center' },
  locationRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: uiRadii.lg, backgroundColor: ui.card, ...shadows.card },
  locationCopy: { flex: 1, gap: 2 },
  locationTitle: { color: ui.ink, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  locationMeta: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 12, borderRadius: uiRadii.lg, borderWidth: 2, borderColor: ui.card, backgroundColor: ui.card, ...shadows.card },
  chipSelected: { borderColor: ui.accent, backgroundColor: ui.accentTint },
  chipLabel: { color: ui.ink, fontSize: 16, lineHeight: 21, fontWeight: '500' },
  chipLabelSelected: { color: ui.accent, fontWeight: '700' },
  reviewCard: { paddingVertical: 4 },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  reviewDivider: { borderTopWidth: 1, borderTopColor: ui.divider },
  reviewCopy: { flex: 1, gap: 2 },
  reviewLabel: { color: ui.muted, fontSize: 13, lineHeight: 17 },
  reviewValue: { color: ui.ink, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  successCard: { minHeight: 360, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  successIcon: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 36, backgroundColor: ui.greenSoft },
  footer: { gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderTopLeftRadius: uiRadii.xl, borderTopRightRadius: uiRadii.xl, backgroundColor: ui.card, ...shadows.nav },
  footerCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: uiRadii.xl, backgroundColor: ui.accentTint },
  footerCopy: { flex: 1, minWidth: 0 },
  footerLabel: { color: ui.muted, fontSize: 12, lineHeight: 16 },
  footerValue: { color: ui.ink, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  footerValueEmpty: { color: ui.inkSoft, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  footerMeta: { color: ui.muted, fontSize: 12, lineHeight: 16 },
  footerDivider: { width: 1, alignSelf: 'stretch', backgroundColor: ui.divider },
  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footerNoteLabel: { flexShrink: 1, color: ui.muted, fontSize: 12, lineHeight: 16, textAlign: 'center' },
});
