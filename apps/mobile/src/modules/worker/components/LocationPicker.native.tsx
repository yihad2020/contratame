import MapView, { Marker, type MapPressEvent } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';

import { ui, uiRadii } from '@/constants/theme';
import type { LocationPickerProps } from '@/modules/worker/components/LocationPicker.types';

export function LocationPicker({ coordinate, onChange }: LocationPickerProps) {
  const choose = (event: MapPressEvent) => onChange(event.nativeEvent.coordinate);
  return (
    <View style={styles.group}>
      <Text style={styles.label}>Elegir en el mapa</Text>
      <Text style={styles.help}>Toca el mapa para mover la base. No realizamos seguimiento continuo.</Text>
      <MapView
        accessibilityLabel="Mapa para elegir la base de trabajo"
        initialRegion={{ ...coordinate, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        onPress={choose}
        style={styles.map}
      >
        <Marker coordinate={coordinate} title="Base de trabajo" />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { color: ui.ink, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  help: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  map: { height: 280, borderRadius: uiRadii.lg, overflow: 'hidden' },
});
