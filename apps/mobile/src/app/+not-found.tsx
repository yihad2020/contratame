import { Link } from 'expo-router'; import { StyleSheet } from 'react-native'; import { Screen } from '@/components/ui/Screen'; import { Body, Title } from '@/components/ui/Typography'; import { colors, spacing } from '@/constants/theme';
export default function NotFoundScreen() { return <Screen><Title>Página no encontrada</Title><Body>La ruta solicitada no existe.</Body><Link href="/" style={styles.link}>Volver al inicio</Link></Screen>; }
const styles = StyleSheet.create({ link: { color: colors.primary, fontWeight: '700', paddingVertical: spacing.md } });
