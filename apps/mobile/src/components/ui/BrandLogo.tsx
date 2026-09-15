import { Image, StyleSheet } from 'react-native';

type BrandLogoProps = { width?: number; accessibilityLabel?: string };

export function BrandLogo({ width = 168, accessibilityLabel = 'Contrátame!' }: BrandLogoProps) {
  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      resizeMode="contain"
      source={require('../../../assets/images/brand/contratame-logo.png')}
      style={[styles.image, { width, height: width / 3.9 }]}
    />
  );
}

const styles = StyleSheet.create({ image: { alignSelf: 'flex-start' } });
