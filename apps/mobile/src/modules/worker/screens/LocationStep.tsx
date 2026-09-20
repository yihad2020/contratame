import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, spacing, typography } from '@/constants/theme';
import { LocationPicker } from '@/modules/worker/components/LocationPicker';
import type { MapCoordinate } from '@/modules/worker/components/LocationPicker.types';
import { OnboardingScaffold } from '@/modules/worker/components/OnboardingScaffold';
import { WorkerSurface } from '@/modules/worker/components/WorkerSurface';
import { useWorkerOnboarding } from '@/modules/worker/onboarding-context';
import { workerFailureMessage } from '@/modules/worker/worker-errors';
import { validateRadius } from '@/modules/worker/validation';
import { saveWorkerLocation } from '@/modules/worker/worker-service';

const SANTA_CRUZ = { latitude: -17.7833, longitude: -63.1821 };

export function LocationStep() {
  const { draft, reload } = useWorkerOnboarding();
  const existing = draft?.location;
  const [coordinate, setCoordinate] = useState<MapCoordinate>(existing?.latitude !== null && existing?.longitude !== null && existing?.latitude !== undefined && existing?.longitude !== undefined
    ? { latitude: existing.latitude, longitude: existing.longitude } : SANTA_CRUZ);
  const [areaLabel, setAreaLabel] = useState(existing?.public_area_label ?? '');
  const [city, setCity] = useState(existing?.city ?? 'Santa Cruz de la Sierra');
  const [department, setDepartment] = useState(existing?.department ?? 'Santa Cruz');
  const [radius, setRadius] = useState(existing ? String(existing.service_radius_m / 1000) : '10');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const savingRef = useRef(false);
  const locatingRef = useRef(false);
  const geocodeRequest = useRef(0);

  async function describe(next: MapCoordinate) {
    setCoordinate(next);
    const request = ++geocodeRequest.current;
    setNotice(null);
    try {
      const result = (await Location.reverseGeocodeAsync(next))[0];
      if (request !== geocodeRequest.current) return;
      if (result) {
        setAreaLabel(result.district || result.subregion || result.name || areaLabel);
        setCity(result.city || result.subregion || city);
        setDepartment(result.region || department);
      } else {
        setNotice('No encontramos una referencia para esta base. Completa manualmente la zona, ciudad y departamento.');
      }
    } catch (cause) {
      workerFailureMessage(cause, '', 'reverse geocode');
      if (request === geocodeRequest.current) setNotice('La base quedó seleccionada. Completa manualmente la zona, ciudad y departamento.');
    }
  }

  async function selectCurrentLocation() {
    if (locatingRef.current) return;
    locatingRef.current = true; setLocating(true);
    setFailure(null); setNotice(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setNotice('No diste permiso de ubicación. Puedes seguir eligiendo tu base manualmente en el mapa.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await describe({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } catch (cause) {
      setNotice(workerFailureMessage(cause, 'No pudimos obtener tu ubicación. Selecciona la base manualmente en el mapa.', 'current location'));
    } finally {
      locatingRef.current = false; setLocating(false);
    }
  }

  async function save() {
    if (!draft || savingRef.current || locatingRef.current) return;
    const checkedRadius = validateRadius(radius);
    const nextErrors: Record<string, string> = checkedRadius.ok ? {} : checkedRadius.errors;
    if (!areaLabel.trim()) nextErrors.area = 'Escribe una referencia pública de la zona.';
    if (!city.trim()) nextErrors.city = 'La ciudad es obligatoria.';
    if (!department.trim()) nextErrors.department = 'El departamento es obligatorio.';
    if (coordinate.latitude < -90 || coordinate.latitude > 90 || coordinate.longitude < -180 || coordinate.longitude > 180) nextErrors.coordinate = 'Selecciona una coordenada válida.';
    if (Object.keys(nextErrors).length || !checkedRadius.ok) { setErrors(nextErrors); return; }
    savingRef.current = true; setSaving(true); setFailure(null); setErrors({});
    try {
      await saveWorkerLocation({ workerId: draft.worker.id, ...coordinate, areaLabel, city, department, radiusM: checkedRadius.value.radiusM });
      await reload();
      router.push('/(app)/worker-onboarding/step/4' as never);
    } catch (cause) { setFailure(workerFailureMessage(cause, 'No se pudo guardar la zona de trabajo.', 'save location')); }
    finally { savingRef.current = false; setSaving(false); }
  }

  return (
    <OnboardingScaffold step={3} title="Zona de trabajo" description="Elige una base privada y el radio en el que normalmente puedes atender. Los clientes no verán tus coordenadas exactas." onNext={() => void save()} nextLoading={saving} nextDisabled={locating}>
      <AppButton label="Usar mi ubicación actual" icon="location" variant="secondary" loading={locating} disabled={saving} onPress={() => void selectCurrentLocation()} />
      {notice ? <FeedbackMessage tone="info">{notice}</FeedbackMessage> : null}
      <LocationPicker coordinate={coordinate} onChange={(next: MapCoordinate) => void describe(next)} />
      {errors.coordinate ? <Text style={styles.error}>{errors.coordinate}</Text> : null}
      <WorkerSurface title="Información pública aproximada">
        <FormField label="Zona o referencia" value={areaLabel} onChangeText={setAreaLabel} error={errors.area} placeholder="Ej. Equipetrol" />
        <FormField label="Ciudad" value={city} onChangeText={setCity} error={errors.city} />
        <FormField label="Departamento" value={department} onChangeText={setDepartment} error={errors.department} />
        <FormField label="Radio de servicio (km)" keyboardType="number-pad" value={radius} onChangeText={setRadius} error={errors.radius} helperText="Entre 1 y 50 km, en kilómetros enteros." />
        <Text style={styles.country}>País: Bolivia (BO)</Text>
      </WorkerSurface>
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, ...typography.caption },
  country: { color: colors.textSecondary, ...typography.caption, marginTop: spacing.xs },
});
