import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { shadows, ui, uiRadii } from '@/constants/theme';

/** Shared overlays of the Explore map card: result-count chip (top-left) and locate button (bottom-right). */
export function ExploreMapOverlay({ countLabel, locating, located, onLocate }: {
  countLabel: string | null;
  locating: boolean;
  located: boolean;
  onLocate(): void;
}) {
  return (
    <>
      {countLabel ? (
        <View pointerEvents="none" style={styles.countChip}>
          <View style={styles.countIcon}><Icon color={ui.accent} name="account-group" size={18} /></View>
          <Text numberOfLines={2} style={styles.countLabel}>{countLabel}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityLabel={located ? 'Actualizar ubicación' : 'Usar mi ubicación'}
        accessibilityRole="button"
        accessibilityState={{ busy: locating, disabled: locating }}
        disabled={locating}
        onPress={onLocate}
        style={({ pressed }) => [styles.locate, pressed && styles.pressed]}
      >
        {locating ? <ActivityIndicator color={ui.accent} /> : <Icon color={ui.ink} name="navigation-variant" size={24} />}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  countChip: { position: 'absolute', top: 14, left: 14, maxWidth: '70%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingLeft: 8, paddingRight: 14, borderRadius: uiRadii.md, backgroundColor: ui.card, ...shadows.card },
  countIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.accentSoft },
  countLabel: { flexShrink: 1, color: ui.ink, fontSize: 13, lineHeight: 17, fontWeight: '600' },
  locate: { position: 'absolute', right: 14, bottom: 14, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.card, ...shadows.raised },
  pressed: { opacity: 0.8 },
});
