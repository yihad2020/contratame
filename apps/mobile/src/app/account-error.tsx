import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { Screen } from '@/components/ui/Screen';
import { Body, DisplayTitle, ErrorMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing } from '@/constants/theme';
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
      <View style={styles.card}>
      <View style={styles.stateIcon}>
        <AppIcon name="error" color={colors.danger} size={sizing.iconLg} />
      </View>
      <View style={styles.heading}>
        <DisplayTitle>No pudimos cargar tu cuenta</DisplayTitle>
        <Body>Tu acceso permanece protegido mientras intentamos resolver la información del perfil.</Body>
        <Body muted>Puedes reintentar ahora o cerrar sesión de forma segura.</Body>
      </View>
      {errorMessage ? <ErrorMessage>{errorMessage}</ErrorMessage> : null}
      <View style={styles.actions}>
        <AppButton label="Reintentar" loading={busyAction === 'retry'} onPress={() => void retry()} />
        <AppButton
          label="Cerrar sesión"
          loading={busyAction === 'signOut'}
          onPress={() => void exit()}
          variant="secondary"
        />
      </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.xl },
  card: { gap: spacing.xl, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
  stateIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: colors.dangerSoft },
  heading: { gap: spacing.md },
  actions: { gap: spacing.md },
});
