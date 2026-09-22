import { Image, StyleSheet } from 'react-native';

export function MascotImage({ size = 132 }: { size?: number }) {
  return (
    <Image
      accessibilityLabel="Oso de Contrátame! atendiendo una llamada"
      resizeMode="contain"
      source={require('../../../assets/images/brand/contratame-bear.png')}
      style={[styles.image, { width: size, height: size }]}
    />
  );
}

const styles = StyleSheet.create({ image: { alignSelf: 'center' } });
