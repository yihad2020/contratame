import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { colors } from '@/constants/theme';

const slides: readonly ImageSourcePropType[] = [
  require('@/assets/images/bolivia/bolivia-01.png'),
  require('@/assets/images/bolivia/bolivia-02.png'),
  require('@/assets/images/bolivia/bolivia-03.png'),
  require('@/assets/images/bolivia/bolivia-04.png'),
  require('@/assets/images/bolivia/bolivia-05.png'),
];

const slideIntervalMs = 4600;
const crossfadeDurationMs = 700;

export function BoliviaHeroSlideshow() {
  const [layerAIndex, setLayerAIndex] = useState(0);
  const [layerBIndex, setLayerBIndex] = useState(1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [opacityA] = useState(() => new Animated.Value(1));
  const [opacityB] = useState(() => new Animated.Value(0));
  const activeLayer = useRef<'a' | 'b'>('a');
  const currentIndex = useRef(0);
  const transitioning = useRef(false);
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        animation.current?.stop();
        transitioning.current = false;
        opacityA.setValue(activeLayer.current === 'a' ? 1 : 0);
        opacityB.setValue(activeLayer.current === 'b' ? 1 : 0);
        return undefined;
      }

      function crossfade() {
        if (transitioning.current) return;
        transitioning.current = true;

        const incomingIndex = (currentIndex.current + 1) % slides.length;
        const showingA = activeLayer.current === 'a';
        const outgoingOpacity = showingA ? opacityA : opacityB;
        const incomingOpacity = showingA ? opacityB : opacityA;

        animation.current = Animated.parallel([
          Animated.timing(outgoingOpacity, {
            duration: crossfadeDurationMs,
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(incomingOpacity, {
            duration: crossfadeDurationMs,
            toValue: 1,
            useNativeDriver: true,
          }),
        ]);

        animation.current.start(({ finished }) => {
          transitioning.current = false;
          if (!finished) return;

          currentIndex.current = incomingIndex;
          activeLayer.current = showingA ? 'b' : 'a';
          const followingIndex = (incomingIndex + 1) % slides.length;
          if (showingA) setLayerAIndex(followingIndex);
          else setLayerBIndex(followingIndex);
        });
      }

      const interval = setInterval(crossfade, slideIntervalMs);

      return () => {
        clearInterval(interval);
        animation.current?.stop();
        transitioning.current = false;
        opacityA.setValue(activeLayer.current === 'a' ? 1 : 0);
        opacityB.setValue(activeLayer.current === 'b' ? 1 : 0);
      };
    }, [opacityA, opacityB, reduceMotion]),
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.Image
        accessibilityIgnoresInvertColors
        accessible={false}
        importantForAccessibility="no"
        resizeMode="cover"
        source={slides[layerAIndex]}
        style={[styles.image, { opacity: opacityA }]}
      />
      <Animated.Image
        accessibilityIgnoresInvertColors
        accessible={false}
        importantForAccessibility="no"
        resizeMode="cover"
        source={slides[layerBIndex]}
        style={[styles.image, { opacity: opacityB }]}
      />
      <View accessible={false} style={styles.scrim} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.navy,
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.navy,
    opacity: 0.48,
  },
});
