import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, IconBubble } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage } from '@/components/ui/Typography';
import { ui } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';

export default function AccountErrorScreen() {
  const { errorMessage, reloadProfile, signOut } = useAuth();
  const [busyAction, setBusyAction] = useState<'retry' | 'signOut' | null>(null);

  async function retry() {
    setBusyAction('retry');
    await reloadProfile();
    setBusyAction(null);
  }

  async function exit() {
    setBusyAction('signOut');
    await signOut();
  }

  return (
    <Screen contentStyle={styles.screen} header={<MarketplaceHeader brand eyebrow="ESTADO DE LA CUENTA" title="Necesitamos reintentar" subtitle="Tu acceso permanece protegido." />}>
      <Card style={styles.card}>
        <IconBubble name="alert-circle" variant="grey" color={ui.danger} size={64} />
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>No pudimos cargar tu cuenta</Text>
          <Text style={styles.body}>Tu acceso permanece protegido mientras intentamos resolver la información del perfil.</Text>
          <Text style={styles.muted}>Puedes reintentar ahora o cerrar sesión de forma segura.</Text>
        </View>
        {errorMessage ? <ErrorMessage>{errorMessage}</ErrorMessage> : null}
        <View style={styles.actions}>
          <PillButton label="Reintentar" icon="refresh" loading={busyAction === 'retry'} onPress={() => void retry()} />
          <PillButton
            icon="logout"
            label="Cerrar sesión"
            loading={busyAction === 'signOut'}
            onPress={() => void exit()}
            variant="outline"
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 20, paddingTop: 20 },
  card: { gap: 20, padding: 22 },
  heading: { gap: 10 },
  title: { color: ui.ink, fontSize: 24, lineHeight: 30, fontWeight: '800' },
  body: { color: ui.inkSoft, fontSize: 16, lineHeight: 22 },
  muted: { color: ui.muted, fontSize: 15, lineHeight: 21 },
  actions: { gap: 10 },
});
