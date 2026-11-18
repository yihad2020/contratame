import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Card, IconBubble } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { Screen } from '@/components/ui/Screen';
import { ui } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <Screen contentStyle={styles.screen} header={<MarketplaceHeader brand />}>
      <Card style={styles.card}>
        <IconBubble name="map-marker-question" variant="soft" size={64} />
        <Text accessibilityRole="header" style={styles.title}>Página no encontrada</Text>
        <Text style={styles.body}>La ruta solicitada no existe.</Text>
        <Link href="/" style={styles.link}>Volver al inicio</Link>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16, paddingTop: 20 },
  card: { alignItems: 'center', gap: 12, padding: 24 },
  title: { color: ui.ink, fontSize: 21, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  body: { color: ui.muted, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  link: { color: ui.accent, fontSize: 16, fontWeight: '700', paddingVertical: 12 },
});
