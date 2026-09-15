import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { AppButton } from '@/components/ui/AppButton'; import { FormField } from '@/components/ui/FormField'; import { Screen } from '@/components/ui/Screen'; import { Body, ErrorMessage, Title } from '@/components/ui/Typography';
import { colors, spacing } from '@/constants/theme'; import { useAuth } from '@/modules/auth/auth-context'; import { validateRegistration, type RegistrationInput, type ValidationErrors } from '@/modules/auth/validation';

const empty: RegistrationInput = { firstName: '', lastName: '', email: '', phone: '', password: '', passwordConfirmation: '' };
export default function SignUpScreen() {
  const { signUp } = useAuth(); const [form, setForm] = useState(empty); const [errors, setErrors] = useState<ValidationErrors>({}); const [failure, setFailure] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  function change(field: keyof RegistrationInput, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit() {
    const checked = validateRegistration(form); if (!checked.ok) { setErrors(checked.errors); return; }
    setErrors({}); setFailure(null); setBusy(true); try { await signUp(form); } catch (cause) { setFailure(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta.'); } finally { setBusy(false); }
  }
  return <Screen><Title>Crea tu cuenta</Title><Body muted>Todos los usuarios pueden solicitar servicios. La capacidad de trabajador se habilitará en otro módulo.</Body>
    <FormField label="Nombre" value={form.firstName} onChangeText={(v) => change('firstName', v)} error={errors.firstName} autoComplete="given-name" />
    <FormField label="Apellido" value={form.lastName} onChangeText={(v) => change('lastName', v)} error={errors.lastName} autoComplete="family-name" />
    <FormField label="Teléfono (opcional)" value={form.phone} onChangeText={(v) => change('phone', v)} error={errors.phone} keyboardType="phone-pad" placeholder="+59170000000" />
    <FormField label="Correo electrónico" value={form.email} onChangeText={(v) => change('email', v)} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <FormField label="Contraseña" value={form.password} onChangeText={(v) => change('password', v)} error={errors.password} secureTextEntry autoComplete="new-password" />
    <FormField label="Confirma tu contraseña" value={form.passwordConfirmation} onChangeText={(v) => change('passwordConfirmation', v)} error={errors.passwordConfirmation} secureTextEntry />
    {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}<AppButton label="Crear cuenta" onPress={() => void submit()} disabled={busy} />
    <Link href="/(auth)/sign-in" style={styles.link}>Ya tengo una cuenta</Link></Screen>;
}
const styles = StyleSheet.create({ link: { color: colors.primary, textAlign: 'center', fontWeight: '700', padding: spacing.md } });
