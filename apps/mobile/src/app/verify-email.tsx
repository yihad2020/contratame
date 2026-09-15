import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AppButton } from '@/components/ui/AppButton'; import { Screen } from '@/components/ui/Screen'; import { Body, ErrorMessage, Title } from '@/components/ui/Typography';
import { colors, spacing } from '@/constants/theme'; import { useAuth } from '@/modules/auth/auth-context';
import { shouldShowEmailVerification } from '@/modules/auth/access-state';

export default function VerifyEmailScreen() {
  const { state, pendingEmail, resendConfirmation, checkVerification, signOut } = useAuth();
  const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function run(action: 'resend' | 'check') { setBusy(true); setError(null); setMessage(null); try {
    if (action === 'resend') { await resendConfirmation(); setMessage('Enviamos un nuevo correo. Revisa también tu carpeta de spam.'); }
    else { const verified = await checkVerification(); if (!verified) setMessage('Aún no recibimos una sesión confirmada. Abre el enlace del correo en este dispositivo.'); }
  } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo completar la operación.'); } finally { setBusy(false); } }
  if (!shouldShowEmailVerification(state)) return <Redirect href="/" />;
  return <Screen><Text style={styles.icon}>✉</Text><Title>Verifica tu correo</Title><Body>Enviamos un enlace de confirmación{pendingEmail ? ` a ${pendingEmail}` : ''}. Debes confirmarlo antes de acceder.</Body>
    {message ? <Text style={styles.success}>{message}</Text> : null}{error ? <ErrorMessage>{error}</ErrorMessage> : null}
    <AppButton label="Ya lo verifiqué" onPress={() => void run('check')} disabled={busy} />
    <AppButton label="Reenviar correo" onPress={() => void run('resend')} disabled={busy || !pendingEmail} variant="secondary" />
    <AppButton label="Cerrar sesión / volver" onPress={() => void signOut()} disabled={busy} variant="secondary" /></Screen>;
}
const styles = StyleSheet.create({ icon: { fontSize: 44, color: colors.primary, marginTop: spacing.xxl }, success: { color: colors.green, backgroundColor: colors.greenBackground, padding: spacing.md, borderRadius: 8 } });
