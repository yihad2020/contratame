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
import {
  validateRegistration,
  type RegistrationInput,
  type ValidationErrors,
} from '@/modules/auth/validation';

const empty: RegistrationInput = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirmation: '',
};

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function change(field: keyof RegistrationInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit() {
    const checked = validateRegistration(form);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setFailure(null);
    setBusy(true);
    try {
      await signUp(form);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGlassScreen longForm>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>ÚNETE A CONTRÁTAME!</Text>
        <DisplayTitle>Crea tu cuenta</DisplayTitle>
        <Body muted>Completa tus datos para comenzar.</Body>
      </View>
      <FormSection label="Datos personales" plain>
        <FormField
          autoComplete="given-name"
          error={errors.firstName}
          label="Nombre"
          onChangeText={(value) => change('firstName', value)}
          value={form.firstName}
        />
        <FormField
          autoComplete="family-name"
          error={errors.lastName}
          label="Apellido"
          onChangeText={(value) => change('lastName', value)}
          value={form.lastName}
        />
        <FormField
          error={errors.phone}
          keyboardType="phone-pad"
          label="Teléfono (opcional)"
          onChangeText={(value) => change('phone', value)}
          placeholder="+591 70000000"
          value={form.phone}
        />
      </FormSection>
      <FormSection label="Cuenta" plain>
        <FormField
          autoCapitalize="none"
          autoComplete="email"
          error={errors.email}
          keyboardType="email-address"
          label="Correo electrónico"
          onChangeText={(value) => change('email', value)}
          value={form.email}
        />
        <FormField
          autoComplete="new-password"
          error={errors.password}
          helperText="Mínimo 8 caracteres."
          label="Contraseña"
          onChangeText={(value) => change('password', value)}
          secureTextEntry
          value={form.password}
        />
        <FormField
          error={errors.passwordConfirmation}
          label="Confirmar contraseña"
          onChangeText={(value) => change('passwordConfirmation', value)}
          onSubmitEditing={() => void submit()}
          returnKeyType="done"
          secureTextEntry
          value={form.passwordConfirmation}
        />
      </FormSection>
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
      <AppButton label="Crear cuenta" loading={busy} onPress={() => void submit()} />
      <Text style={styles.accountPrompt}>
        ¿Ya tienes una cuenta?{' '}
        <Link href="/(auth)/sign-in" style={styles.link}>Iniciar sesión</Link>
      </Text>
    </AuthGlassScreen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.xs },
  eyebrow: { color: colors.primary, ...typography.overline },
  accountPrompt: { color: colors.textSecondary, textAlign: 'center', ...typography.body },
  link: { color: colors.primary, fontWeight: '700' },
});
