import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { RequestLocationPickerProps } from '@/modules/service-request/components/RequestLocationPicker.types';

export function RequestLocationPicker({ coordinate, selected, onChange }: RequestLocationPickerProps) {
  const [latitude, setLatitude] = useState(String(coordinate.latitude));
  const [longitude, setLongitude] = useState(String(coordinate.longitude));
  const [error, setError] = useState<string | undefined>();

  function choose() {
    const next = { latitude: Number(latitude), longitude: Number(longitude) };
    if (!Number.isFinite(next.latitude) || !Number.isFinite(next.longitude)
        || next.latitude < -90 || next.latitude > 90
        || next.longitude < -180 || next.longitude > 180) {
      setError('Ingresa coordenadas válidas dentro de sus rangos.');
      return;
    }
    setError(undefined);
    onChange(next);
  }

  return (
    <View style={styles.fallback}>
      <Text style={styles.title}>Ubicación exacta del trabajo</Text>
      <Text style={styles.help}>El mapa interactivo está disponible en Android/iOS. Para probar el formulario web, introduce las coordenadas y confírmalas.</Text>
      <FormField label="Latitud" keyboardType="numbers-and-punctuation" value={latitude} onChangeText={setLatitude} />
      <FormField label="Longitud" keyboardType="numbers-and-punctuation" value={longitude} onChangeText={setLongitude} error={error} />
      <AppButton label={selected ? 'Actualizar coordenadas' : 'Usar estas coordenadas'} icon="location" variant="secondary" onPress={choose} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg },
  title: { color: colors.text, ...typography.bodyStrong },
  help: { color: colors.textSecondary, ...typography.caption },
});
