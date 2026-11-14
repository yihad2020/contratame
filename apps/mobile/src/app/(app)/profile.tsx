import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { FormField } from '@/components/ui/FormField';
import { FormSection } from '@/components/ui/FormSection';
import { MenuList } from '@/components/ui/MenuList';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';
import { getInitials } from '@/modules/home/home-model';
import { validateProfileInput, type ValidationErrors } from '@/modules/auth/validation';
import { updateOwnProfile } from '@/modules/profile/profile-service';

export default function ProfileScreen() {
  const { profile, user, replaceProfile, signOut } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function clearError(field: 'firstName' | 'lastName' | 'phone') {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage(null);
  }

  async function submit() {
    const checked = validateProfileInput({ firstName, lastName, phone });
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setMessage(null);
    setBusy(true);
    try {
      replaceProfile(await updateOwnProfile(checked.value));
      setFirstName(checked.value.firstName);
      setLastName(checked.value.lastName);
      setPhone(checked.value.phone);
      setMessage({ tone: 'success', text: 'Tus datos se actualizaron correctamente.' });
    } catch (cause) {
      setMessage({
        tone: 'error',
        text: cause instanceof Error ? cause.message : 'No se pudo actualizar el perfil.',
      });
    } finally {
      setBusy(false);
    }
  }

  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'Cuenta Contrátame!';

  return (
    <Screen contentStyle={styles.screen} footer={<MarketplaceNav active="profile" />} header={<MarketplaceHeader brand title="Mi perfil" subtitle="Tu cuenta y datos personales." />}>
      <View style={styles.identity}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{getInitials(profile?.first_name, profile?.last_name)}</Text></View>
        <View style={styles.identityCopy}>
          <Text numberOfLines={1} style={styles.identityName}>{fullName}</Text>
          <View style={styles.emailRow}>
            <AppIcon color={colors.textSecondary} name="mail" size={sizing.iconSm} />
            <Text numberOfLines={1} selectable style={styles.identityEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      <MenuList
        label="Profesional"
        items={[
          { key: 'certification', title: 'Certificación', description: 'Consulta o solicita tu verificación profesional', icon: 'check', onPress: () => router.push('/(app)/certification' as never) },
        ]}
      />
      <MenuList
        label="Actividad"
        items={[
          { key: 'favorites', title: 'Favoritos', description: 'Profesionales que guardaste', icon: 'heart', onPress: () => router.push('/(app)/favorites' as never) },
          { key: 'reports', title: 'Mis reportes', description: 'Seguimiento privado de reportes enviados', icon: 'report', onPress: () => router.push('/(app)/reports' as never) },
        ]}
      />

      <FormSection label="Información personal">
        <FormField
          autoComplete="given-name"
          error={errors.firstName}
          label="Nombre"
          onChangeText={(value) => {
            setFirstName(value);
            clearError('firstName');
          }}
          value={firstName}
        />
        <FormField
          autoComplete="family-name"
          error={errors.lastName}
          label="Apellido"
          onChangeText={(value) => {
            setLastName(value);
            clearError('lastName');
          }}
          value={lastName}
        />
        <FormField
          error={errors.phone}
          keyboardType="phone-pad"
          label="Teléfono (opcional)"
          onChangeText={(value) => {
            setPhone(value);
            clearError('phone');
          }}
          placeholder="+591 70000000"
          value={phone}
        />
        <Text style={styles.helper}>El correo electrónico no se puede editar.</Text>
        {message?.tone === 'success' ? <FeedbackMessage>{message.text}</FeedbackMessage> : null}
        {message?.tone === 'error' ? <ErrorMessage>{message.text}</ErrorMessage> : null}
        <AppButton icon="check" label="Guardar cambios" loading={busy} onPress={() => void submit()} />
      </FormSection>

      <MenuList
        label="Cuenta"
        items={[{ key: 'signout', title: 'Cerrar sesión', icon: 'logout', tone: 'danger', onPress: () => void signOut() }]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.xl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg, borderRadius: radii.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 64, height: 64, borderRadius: radii.xl, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.5 },
  identityCopy: { flex: 1, gap: spacing.xs },
  identityName: { color: colors.text, fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.4 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  identityEmail: { flex: 1, color: colors.textSecondary, ...typography.caption },
  helper: { color: colors.textSecondary, ...typography.caption },
});
