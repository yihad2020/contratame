import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PillButton } from '@/components/ui/PillButton';
import { shadows, ui, uiRadii } from '@/constants/theme';
import { RequestField } from '@/modules/service-request/components/RequestKit';
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
      <RequestField label="Latitud" keyboardType="numbers-and-punctuation" value={latitude} onChangeText={setLatitude} />
      <RequestField label="Longitud" keyboardType="numbers-and-punctuation" value={longitude} onChangeText={setLongitude} error={error} />
      <PillButton label={selected ? 'Actualizar coordenadas' : 'Usar estas coordenadas'} icon="map-marker" variant="outline" onPress={choose} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { gap: 12, padding: 16, backgroundColor: ui.card, borderRadius: uiRadii.xl, ...shadows.card },
  title: { color: ui.ink, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  help: { color: ui.muted, fontSize: 13, lineHeight: 18 },
});
