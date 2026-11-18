import MapView, { Marker } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

import { shadows, ui, uiRadii } from '@/constants/theme';
import { ExploreMapOverlay } from '@/modules/marketplace/components/ExploreMapOverlay';
import { exploreMapFallbackCenter, type ExploreMapProps } from '@/modules/marketplace/components/ExploreMap.types';

/**
 * Map card of the Explore mockup. It only shows the customer's own location (or the city centre):
 * results carry no coordinates and worker exact locations are private, so no worker pins are drawn.
 */
export function ExploreMap({ location, countLabel, locating, onLocate }: ExploreMapProps) {
  const center = location ?? exploreMapFallbackCenter;
  const delta = location ? 0.04 : 0.12;
  return (
    <View style={styles.card}>
      <MapView
        accessibilityLabel={location ? 'Mapa centrado en tu ubicación' : 'Mapa de Santa Cruz de la Sierra'}
        pitchEnabled={false}
        region={{ ...center, latitudeDelta: delta, longitudeDelta: delta }}
        rotateEnabled={false}
        scrollEnabled={false}
        style={styles.map}
        toolbarEnabled={false}
        zoomEnabled={false}
      >
        {location ? <Marker coordinate={location} pinColor={ui.accent} title="Tu ubicación" /> : null}
      </MapView>
      <ExploreMapOverlay countLabel={countLabel} located={Boolean(location)} locating={locating} onLocate={onLocate} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: 210, borderRadius: uiRadii.xl, overflow: 'hidden', backgroundColor: ui.tag, ...shadows.card },
  map: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
