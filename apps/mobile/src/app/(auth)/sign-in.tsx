import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { Screen } from '@/components/ui/Screen';
import { Body, ErrorMessage, Title } from '@/components/ui/Typography';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit() {
    setBusy(true); setError(null);
    try { await signIn(email, password); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.'); } finally { setBusy(false); }
  }
  return <Screen><Text style={styles.brand}>Contrátame!</Text><Title>Inicia sesión</Title><Body muted>Accede a tu cuenta con tu correo verificado.</Body>
    <FormField label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <FormField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
    {error ? <ErrorMessage>{error}</ErrorMessage> : null}<AppButton label="Iniciar sesión" onPress={() => void submit()} disabled={busy || !email.trim() || !password} />
    <Link href="/(auth)/sign-up" style={styles.link}>¿No tienes cuenta? Regístrate</Link></Screen>;
}
const styles = StyleSheet.create({ brand: { color: colors.primary, fontWeight: '900', fontSize: 20, marginTop: spacing.xxl }, link: { color: colors.primary, textAlign: 'center', fontSize: 16, fontWeight: '700', padding: spacing.md } });
