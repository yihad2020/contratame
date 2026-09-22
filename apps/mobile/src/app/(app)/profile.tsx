import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { FormField } from '@/components/ui/FormField';
import { FormSection } from '@/components/ui/FormSection';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';
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

  return (
    <Screen contentStyle={styles.screen} footer={<MarketplaceNav active="profile" />} header={<MarketplaceHeader brand title="Mi perfil" subtitle="Tu cuenta y datos personales" />}>
      <View style={styles.summary}>
        <View style={styles.avatar}><AppIcon color={colors.primary} name="account" size={30} /></View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryName}>{profile ? `${profile.first_name} ${profile.last_name}` : 'Cuenta Contrátame!'}</Text>
          <Text numberOfLines={1} style={styles.summaryEmail}>{user?.email}</Text>
        </View>
      </View>
      <FormSection label="Cuenta">
        <View style={styles.metadataRow}>
          <View style={styles.metadataIcon}>
            <AppIcon color={colors.textSecondary} name="mail" size={sizing.iconMd} />
          </View>
          <View style={styles.metadataCopy}>
            <Text style={styles.metadataLabel}>Correo electrónico</Text>
            <Text numberOfLines={1} selectable style={styles.metadataValue}>{user?.email}</Text>
            <Text style={styles.metadataHelper}>No editable</Text>
          </View>
        </View>
      </FormSection>
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
      </FormSection>
      {message?.tone === 'success' ? <FeedbackMessage>{message.text}</FeedbackMessage> : null}
      {message?.tone === 'error' ? <ErrorMessage>{message.text}</ErrorMessage> : null}
      <AppButton icon="check" label="Guardar cambios" loading={busy} onPress={() => void submit()} />
      <FormSection label="Cuenta">
        <AppButton icon="logout" label="Cerrar sesión" onPress={() => void signOut()} variant="ghost" />
      </FormSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 58, height: 58, borderRadius: radii.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1, gap: spacing.xs },
  summaryName: { color: colors.text, ...typography.section },
  summaryEmail: { color: colors.textSecondary, ...typography.caption },
  metadataRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  metadataIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  metadataCopy: { flex: 1, gap: spacing.xxs },
  metadataLabel: { color: colors.textSecondary, ...typography.caption },
  metadataValue: { color: colors.text, ...typography.bodyStrong },
  metadataHelper: { color: colors.textSecondary, ...typography.caption },
});
