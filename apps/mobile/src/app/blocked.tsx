import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Body, DisplayTitle } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';

export default function BlockedScreen() {
  const { state, signOut } = useAuth();
  const suspended = state === 'suspended';

  return (
    <Screen contentStyle={styles.screen}>
      <BrandLogo width={150} />
      <View style={styles.stateIcon}>
        <AppIcon name="lock" color={colors.danger} size={sizing.iconLg} />
      </View>
      <View style={styles.heading}>
        <StatusBadge label={suspended ? 'Cuenta suspendida' : 'Cuenta desactivada'} tone="danger" />
        <DisplayTitle>{suspended ? 'Tu acceso está suspendido' : 'Tu cuenta está desactivada'}</DisplayTitle>
        <Body>
          {suspended
            ? 'Por el momento no puedes acceder a las funciones protegidas de Contrátame!'
            : 'Esta cuenta no puede acceder a las funciones protegidas de Contrátame!'}
        </Body>
        <Body muted>Tu identidad y perfil no se eliminan al cerrar esta sesión.</Body>
      </View>
      <AppButton icon="logout" label="Cerrar sesión" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.xxl },
  stateIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: colors.dangerSoft },
  heading: { alignItems: 'flex-start', gap: spacing.md },
});
