import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { colors, motion, radii, sizing, spacing, typography } from '@/constants/theme';

export type SegmentOption<T extends string> = { value: T; label: string; hint?: string };

const INSET = spacing.xs;
const useNativeDriver = Platform.OS !== 'web';

/** Two-or-more option switch with a spring-animated thumb. `dark` sits on navy headers. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = 'light',
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: 'light' | 'dark';
}) {
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const dark = tone === 'dark';

  useEffect(() => {
    Animated.spring(offset, { toValue: index * segmentWidth, useNativeDriver, ...motion.slideSpring }).start();
  }, [index, offset, segmentWidth]);

  function onLayout(event: LayoutChangeEvent) {
    setSegmentWidth((event.nativeEvent.layout.width - INSET * 2) / options.length);
  }

  return (
    <View accessibilityRole="tablist" onLayout={onLayout} style={[styles.track, dark ? styles.trackDark : styles.trackLight]}>
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, dark ? styles.thumbDark : styles.thumbLight, { width: segmentWidth, transform: [{ translateX: offset }] }]}
        />
      ) : null}
      {options.map((option) => {
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
            <Text numberOfLines={1} style={[styles.label, selected ? (dark ? styles.labelOnDarkSelected : styles.labelSelected) : (dark ? styles.labelOnDark : styles.labelIdle)]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: INSET, borderRadius: radii.pill },
  trackLight: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  trackDark: { backgroundColor: colors.onDarkSurface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.onDarkBorder },
  thumb: { position: 'absolute', top: INSET, bottom: INSET, left: INSET, borderRadius: radii.pill },
  thumbLight: { backgroundColor: colors.navyDeep },
  thumbDark: { backgroundColor: colors.white },
  segment: { flex: 1, minHeight: sizing.touchTarget - INSET, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radii.pill },
  label: { ...typography.label },
  labelIdle: { color: colors.textSecondary },
  labelSelected: { color: colors.white, fontWeight: '700' },
  labelOnDark: { color: colors.textOnDarkMuted },
  labelOnDarkSelected: { color: colors.navyDeep, fontWeight: '700' },
});
