import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthGlassScreen } from '@/components/brand/AuthGlassScreen';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { FormSection } from '@/components/ui/FormSection';
import { Body, DisplayTitle, ErrorMessage } from '@/components/ui/Typography';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGlassScreen>
      <View style={styles.heading}>
        <DisplayTitle>Bienvenido de nuevo</DisplayTitle>
        <Body muted>Inicia sesión para continuar.</Body>
      </View>
      <FormSection plain>
        <FormField
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label="Correo electrónico"
          onChangeText={setEmail}
          returnKeyType="next"
          value={email}
        />
        <FormField
          autoComplete="current-password"
          label="Contraseña"
          onChangeText={setPassword}
          onSubmitEditing={() => void submit()}
          returnKeyType="done"
          secureTextEntry
          value={password}
        />
        {error ? <ErrorMessage>{error}</ErrorMessage> : null}
        <AppButton
          disabled={!email.trim() || !password}
          label="Iniciar sesión"
          loading={busy}
          onPress={() => void submit()}
        />
      </FormSection>
      <Text style={styles.accountPrompt}>
        ¿No tienes cuenta?{' '}
        <Link href="/(auth)/sign-up" style={styles.link}>Crear cuenta</Link>
      </Text>
    </AuthGlassScreen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.xs },
  accountPrompt: { color: colors.textSecondary, textAlign: 'center', ...typography.body },
  link: { color: colors.primary, fontWeight: '700' },
});
