import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Screen } from '@/components/ui/Screen';
import { Body, DisplayTitle, ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { shouldShowEmailVerification } from '@/modules/auth/access-state';
import { useAuth } from '@/modules/auth/auth-context';

export default function VerifyEmailScreen() {
  const { state, pendingEmail, resendConfirmation, checkVerification, signOut } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'resend' | 'check' | 'signOut' | null>(null);

  async function run(action: 'resend' | 'check') {
    setBusyAction(action);
    setError(null);
    setMessage(null);
    try {
      if (action === 'resend') {
        await resendConfirmation();
        setMessage('Enviamos un nuevo correo. Revisa también tu carpeta de spam.');
      } else {
        const verified = await checkVerification();
        if (!verified) {
          setMessage('Aún no detectamos la confirmación. Abre el enlace del correo en este dispositivo.');
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la operación.');
    } finally {
      setBusyAction(null);
    }
  }

  async function exit() {
    setBusyAction('signOut');
    await signOut();
  }

  if (!shouldShowEmailVerification(state)) return <Redirect href="/" />;

  return (
    <Screen contentStyle={styles.screen}>
      <BrandLogo width={150} />
      <View style={styles.stateIcon}>
        <AppIcon name="mail" size={sizing.iconLg} />
      </View>
      <View style={styles.heading}>
        <DisplayTitle>Verifica tu correo</DisplayTitle>
        <Body>Enviamos un enlace de confirmación a:</Body>
        {pendingEmail ? <Text selectable style={styles.email}>{pendingEmail}</Text> : null}
        <Body muted>Debes confirmarlo antes de acceder a tu cuenta.</Body>
      </View>
      {message ? <FeedbackMessage tone="info">{message}</FeedbackMessage> : null}
      {error ? <ErrorMessage>{error}</ErrorMessage> : null}
      <View style={styles.actions}>
        <AppButton label="Ya lo verifiqué" loading={busyAction === 'check'} onPress={() => void run('check')} />
        <AppButton
          disabled={!pendingEmail}
          label="Reenviar correo"
          loading={busyAction === 'resend'}
          onPress={() => void run('resend')}
          variant="secondary"
        />
        <AppButton
          label="Cerrar sesión y volver"
          loading={busyAction === 'signOut'}
          onPress={() => void exit()}
          variant="ghost"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.xxl },
  stateIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: colors.primarySoft },
  heading: { gap: spacing.sm },
  email: { color: colors.text, ...typography.bodyStrong },
  actions: { gap: spacing.md },
});
