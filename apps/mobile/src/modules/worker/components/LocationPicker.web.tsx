import { StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/ui/FormField';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { LocationPickerProps } from '@/modules/worker/components/LocationPicker.types';

export function LocationPicker({ coordinate, onChange }: LocationPickerProps) {
  return (
    <View style={styles.fallback}>
      <Text style={styles.title}>Selección web de coordenadas</Text>
      <Text style={styles.help}>El mapa interactivo está disponible en Android/iOS. En web puedes introducir una base para conservar la compilación y probar el formulario.</Text>
      <FormField label="Latitud" keyboardType="numbers-and-punctuation" value={String(coordinate.latitude)} onChangeText={(value) => {
        const latitude = Number(value); if (Number.isFinite(latitude)) onChange({ ...coordinate, latitude });
      }} />
      <FormField label="Longitud" keyboardType="numbers-and-punctuation" value={String(coordinate.longitude)} onChangeText={(value) => {
        const longitude = Number(value); if (Number.isFinite(longitude)) onChange({ ...coordinate, longitude });
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg },
  title: { color: colors.text, ...typography.bodyStrong },
  help: { color: colors.textSecondary, ...typography.caption },
});
