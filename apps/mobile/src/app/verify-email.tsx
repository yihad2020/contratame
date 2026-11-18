import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Card, IconBubble } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { ui, uiRadii } from '@/constants/theme';
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
    <Screen contentStyle={styles.screen} header={<MarketplaceHeader brand eyebrow="SEGURIDAD DE TU CUENTA" title="Verifica tu correo" subtitle="Un paso más para comenzar." />}>
      <Card style={styles.card}>
        <IconBubble name="email" variant="soft" size={64} />
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>Verifica tu correo</Text>
          <Text style={styles.body}>Enviamos un enlace de confirmación a:</Text>
          {pendingEmail ? (
            <View style={styles.emailRow}>
              <Icon color={ui.muted} name="email-outline" size={20} />
              <Text selectable style={styles.email}>{pendingEmail}</Text>
            </View>
          ) : null}
          <Text style={styles.muted}>Debes confirmarlo antes de acceder a tu cuenta.</Text>
        </View>
        {message ? <FeedbackMessage tone="info">{message}</FeedbackMessage> : null}
        {error ? <ErrorMessage>{error}</ErrorMessage> : null}
        <View style={styles.actions}>
          <PillButton label="Ya lo verifiqué" icon="check-circle" loading={busyAction === 'check'} onPress={() => void run('check')} />
          <PillButton
            disabled={!pendingEmail}
            icon="email-sync"
            label="Reenviar correo"
            loading={busyAction === 'resend'}
            onPress={() => void run('resend')}
            variant="outline"
          />
          <PillButton
            icon="logout"
            label="Cerrar sesión y volver"
            loading={busyAction === 'signOut'}
            onPress={() => void exit()}
            variant="soft"
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 20, paddingTop: 20 },
  card: { gap: 20, padding: 22 },
  heading: { gap: 8 },
  title: { color: ui.ink, fontSize: 24, lineHeight: 30, fontWeight: '800' },
  body: { color: ui.inkSoft, fontSize: 16, lineHeight: 22 },
  muted: { color: ui.muted, fontSize: 15, lineHeight: 21 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: uiRadii.md, backgroundColor: ui.tag },
  email: { flex: 1, color: ui.ink, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  actions: { gap: 10 },
});
