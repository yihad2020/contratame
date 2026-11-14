import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { colors, motion, radii, sizing, spacing, typography } from '@/constants/theme';
import type { HomeMode } from '@/modules/home/home-model';

const OPTIONS: { value: HomeMode; label: string; hint: string }[] = [
  { value: 'hire', label: 'Contratar', hint: 'Muestra búsqueda y profesionales' },
  { value: 'work', label: 'Trabajar', hint: 'Muestra tu perfil profesional' },
];

const INSET = spacing.xs;
const useNativeDriver = Platform.OS !== 'web';

export function ModeSwitch({ value, onChange }: { value: HomeMode; onChange: (mode: HomeMode) => void }) {
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const index = OPTIONS.findIndex((option) => option.value === value);

  useEffect(() => {
    Animated.spring(offset, { toValue: index * segmentWidth, useNativeDriver, ...motion.slideSpring }).start();
  }, [index, offset, segmentWidth]);

  function onLayout(event: LayoutChangeEvent) {
    setSegmentWidth((event.nativeEvent.layout.width - INSET * 2) / OPTIONS.length);
  }

  return (
    <View accessibilityRole="tablist" onLayout={onLayout} style={styles.track}>
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, { width: segmentWidth, transform: [{ translateX: offset }] }]}
        />
      ) : null}
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityHint={option.hint}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={styles.segment}
          >
            <Text style={[styles.label, selected ? styles.labelSelected : styles.labelIdle]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: INSET,
    borderRadius: radii.pill,
    backgroundColor: colors.onDarkSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onDarkBorder,
  },
  thumb: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    left: INSET,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  segment: { flex: 1, minHeight: sizing.touchTarget - INSET, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  label: { ...typography.label },
  labelSelected: { color: colors.navyDeep, fontWeight: '700' },
  labelIdle: { color: colors.textOnDarkMuted },
});
