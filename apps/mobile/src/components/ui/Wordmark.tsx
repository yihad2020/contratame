import { Image, StyleSheet } from 'react-native';

const RATIO = 674 / 107;

/** Horizontal "Contrátame!" wordmark (from the brand kit) for dark or light surfaces. */
export function Wordmark({ width = 160, tone = 'light' }: { width?: number; tone?: 'light' | 'dark' }) {
  return (
    <Image
      accessibilityLabel="Contrátame!"
      accessibilityRole="image"
      resizeMode="contain"
      source={tone === 'light'
        ? require('../../../assets/images/brand/contratame-wordmark-white.png')
        : require('../../../assets/images/brand/contratame-wordmark-navy.png')}
      style={[styles.image, { width, height: width / RATIO }]}
    />
  );
}

const styles = StyleSheet.create({ image: {} });
