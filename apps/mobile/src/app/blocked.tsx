import { StyleSheet, Text, View } from 'react-native';

import { Card, IconBubble, StatusPill } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ui } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';

export default function BlockedScreen() {
  const { state, signOut } = useAuth();
  const suspended = state === 'suspended';

  return (
    <Screen contentStyle={styles.screen} header={<MarketplaceHeader brand eyebrow="ESTADO DE LA CUENTA" title="Acceso restringido" subtitle="La seguridad de tu cuenta es importante." />}>
      <Card style={styles.card}>
        <IconBubble name="lock" variant="grey" color={ui.danger} size={64} />
        <View style={styles.heading}>
          <StatusPill icon="close-circle" label={suspended ? 'Cuenta suspendida' : 'Cuenta desactivada'} tone="danger" />
          <Text accessibilityRole="header" style={styles.title}>{suspended ? 'Tu acceso está suspendido' : 'Tu cuenta está desactivada'}</Text>
          <Text style={styles.body}>
            {suspended
              ? 'Por el momento no puedes acceder a las funciones protegidas de Contrátame!'
              : 'Esta cuenta no puede acceder a las funciones protegidas de Contrátame!'}
          </Text>
          <Text style={styles.muted}>Tu identidad y perfil no se eliminan al cerrar esta sesión.</Text>
        </View>
        <PillButton icon="logout" label="Cerrar sesión" variant="dark" onPress={() => void signOut()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 20, paddingTop: 20 },
  card: { gap: 20, padding: 22 },
  heading: { alignItems: 'flex-start', gap: 10 },
  title: { color: ui.ink, fontSize: 24, lineHeight: 30, fontWeight: '800' },
  body: { color: ui.inkSoft, fontSize: 16, lineHeight: 22 },
  muted: { color: ui.muted, fontSize: 15, lineHeight: 21 },
});
