import MapView, { Marker, type MapPressEvent } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';

import { shadows, ui, uiRadii } from '@/constants/theme';
import type { RequestLocationPickerProps } from '@/modules/service-request/components/RequestLocationPicker.types';

export function RequestLocationPicker({ coordinate, selected, onChange }: RequestLocationPickerProps) {
  const choose = (event: MapPressEvent) => onChange(event.nativeEvent.coordinate);
  return (
    <View style={styles.group}>
      <Text style={styles.label}>Ubicación exacta del trabajo</Text>
      <Text style={styles.help}>Toca el mapa para marcar el lugar. Solo tú podrás verla antes de una contratación; no realizamos seguimiento continuo.</Text>
      <View style={styles.mapFrame}>
        <MapView
          accessibilityLabel="Mapa para elegir la ubicación exacta del trabajo"
          onPress={choose}
          region={{ ...coordinate, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
          style={styles.map}
        >
          {selected ? <Marker coordinate={coordinate} title="Lugar del trabajo" /> : null}
        </MapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { color: ui.inkSoft, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  help: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  mapFrame: { borderRadius: uiRadii.xl, backgroundColor: ui.card, ...shadows.card },
  map: { height: 280, borderRadius: uiRadii.xl, overflow: 'hidden' },
});
