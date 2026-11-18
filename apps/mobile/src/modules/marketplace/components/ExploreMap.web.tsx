import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { shadows, ui, uiRadii } from '@/constants/theme';
import { ExploreMapOverlay } from '@/modules/marketplace/components/ExploreMapOverlay';
import type { ExploreMapProps } from '@/modules/marketplace/components/ExploreMap.types';

/** Web fallback for the Explore map card: the interactive map is only available on Android/iOS. */
export function ExploreMap({ location, countLabel, locating, onLocate }: ExploreMapProps) {
  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.streets}>
        <View style={[styles.street, styles.streetA]} />
        <View style={[styles.street, styles.streetB]} />
        <View style={[styles.street, styles.streetC]} />
        <View style={[styles.street, styles.streetD]} />
      </View>
      <View accessible accessibilityLabel={location ? 'Tu ubicación está lista' : 'Santa Cruz de la Sierra'} style={styles.center}>
        <Icon color={ui.accent} name="map-marker" size={34} />
        <Text style={styles.city}>{location ? 'Tu ubicación' : 'Santa Cruz\nde la Sierra'}</Text>
      </View>
      <ExploreMapOverlay countLabel={countLabel} located={Boolean(location)} locating={locating} onLocate={onLocate} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: 210, borderRadius: uiRadii.xl, overflow: 'hidden', backgroundColor: ui.navySoft, alignItems: 'center', justifyContent: 'center', ...shadows.card },
  streets: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  street: { position: 'absolute', backgroundColor: ui.card, opacity: 0.85 },
  streetA: { left: -20, right: -20, top: 70, height: 8, transform: [{ rotate: '-8deg' }] },
  streetB: { left: -20, right: -20, top: 150, height: 6, transform: [{ rotate: '12deg' }] },
  streetC: { top: -20, bottom: -20, left: '30%', width: 7, transform: [{ rotate: '18deg' }] },
  streetD: { top: -20, bottom: -20, left: '68%', width: 9, transform: [{ rotate: '-14deg' }] },
  center: { alignItems: 'center', gap: 2 },
  city: { color: ui.inkSoft, fontSize: 17, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
});
