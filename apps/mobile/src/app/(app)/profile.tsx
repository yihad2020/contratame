import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { FormField } from '@/components/ui/FormField';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Card, IconBubble } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { shadows, ui, uiRadii } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';
import { validateProfileInput, type ValidationErrors } from '@/modules/auth/validation';
import { getMyNotificationUnreadCount } from '@/modules/notification/notification-service';
import { updateOwnProfile } from '@/modules/profile/profile-service';
import { workerFailureMessage } from '@/modules/worker/worker-errors';
import { startOrResumeWorkerOnboarding } from '@/modules/worker/worker-service';

export default function ProfileScreen() {
  const { profile, user, replaceProfile, signOut } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);
  const [startingWorker, setStartingWorker] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const startingWorkerRef = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    void getMyNotificationUnreadCount()
      .then((count) => { if (active) setUnreadNotifications(count); })
      .catch(() => { if (active) setUnreadNotifications(null); });
    return () => { active = false; };
  }, []));

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

  async function openWorkerArea() {
    if (startingWorkerRef.current) return;
    startingWorkerRef.current = true;
    setStartingWorker(true);
    try {
      await startOrResumeWorkerOnboarding();
      setWorkerError(null);
      router.push('/(app)/worker-onboarding' as never);
    } catch (cause) {
      const text = workerFailureMessage(cause, 'Inténtalo nuevamente.', 'start or resume worker');
      setWorkerError(text);
      Alert.alert('No pudimos abrir tu perfil', text);
    } finally { startingWorkerRef.current = false; setStartingWorker(false); }
  }

  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'Cuenta Contrátame!';
  const hasUnread = typeof unreadNotifications === 'number' && unreadNotifications > 0;

  const summary = (
    <Card accessibilityLabel={`${fullName}. ${detailsOpen ? 'Ocultar' : 'Ver'} mis datos`} onPress={() => setDetailsOpen((open) => !open)} style={styles.summary}>
      <Avatar badge="online" name={fullName} size={96} />
      <View style={styles.summaryCopy}>
        <Text numberOfLines={2} style={styles.summaryName}>{fullName}</Text>
        <View style={styles.emailRow}>
          <Icon color={ui.muted} name="email-outline" size={20} />
          <Text numberOfLines={1} style={styles.summaryEmail}>{user?.email}</Text>
        </View>
        <View style={styles.memberPill}>
          <Icon color={ui.accent} name="crown" size={18} />
          <Text numberOfLines={1} style={styles.memberLabel}>Miembro Contrátame</Text>
        </View>
      </View>
      <Icon color={ui.accent} name="chevron-right" size={30} />
    </Card>
  );

  return (
    <Screen
      contentStyle={styles.screen}
      footer={<MarketplaceNav active="profile" />}
      header={<MarketplaceHeader
        action={{
          label: 'Abrir notificaciones',
          icon: 'notifications',
          badgeCount: unreadNotifications,
          onPress: () => router.push('/(app)/notifications' as never),
        }}
        brand
        overlap={summary}
        overlapInset={70}
        subtitle="Gestiona tu cuenta y preferencias"
        title="Mi perfil"
      />}
    >
      <View style={styles.menu}>
        <MenuRow expanded={detailsOpen} icon="account" label="Mis datos" onPress={() => setDetailsOpen((open) => !open)} />
        {detailsOpen ? (
          <Card style={styles.details}>
            <View style={styles.metadataRow}>
              <IconBubble name="email-outline" shape="square" size={44} variant="grey" />
              <View style={styles.metadataCopy}>
                <Text style={styles.metadataLabel}>Correo electrónico</Text>
                <Text numberOfLines={1} selectable style={styles.metadataValue}>{user?.email}</Text>
                <Text style={styles.metadataHelper}>No editable</Text>
              </View>
            </View>
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
            {message?.tone === 'success' ? <FeedbackMessage>{message.text}</FeedbackMessage> : null}
            {message?.tone === 'error' ? <ErrorMessage>{message.text}</ErrorMessage> : null}
            <PillButton icon="check" label="Guardar cambios" loading={busy} onPress={() => void submit()} size="lg" />
          </Card>
        ) : null}
        <MenuRow icon="heart" label="Favoritos" onPress={() => router.push('/(app)/favorites' as never)} />
        <MenuRow icon="calendar-check" label="Trabajos contratados" onPress={() => router.push('/(app)/bookings' as never)} />
        <MenuRow
          busy={startingWorker}
          icon="briefcase"
          label="Trabajar en Contrátame"
          onPress={() => void openWorkerArea()}
          subtitle={startingWorker ? 'Preparando tu perfil…' : undefined}
        />
        {workerError ? <ErrorMessage>{workerError}</ErrorMessage> : null}
        <MenuRow icon="certificate" label="Certificación profesional" onPress={() => router.push('/(app)/certification' as never)} />
        <MenuRow
          accessibilityHint={hasUnread ? `${unreadNotifications} sin leer` : undefined}
          dot={hasUnread}
          icon="bell"
          label="Notificaciones"
          onPress={() => router.push('/(app)/notifications' as never)}
        />
        <MenuRow icon="flag" label="Mis reportes" onPress={() => router.push('/(app)/reports' as never)} />
      </View>
      <PillButton icon="logout" label="Cerrar sesión" onPress={() => void signOut()} size="lg" variant="dark" />
    </Screen>
  );
}

function MenuRow({ icon, label, subtitle, onPress, dot = false, busy = false, expanded, accessibilityHint }: {
  icon: IconName;
  label: string;
  subtitle?: string;
  onPress: () => void;
  dot?: boolean;
  busy?: boolean;
  expanded?: boolean;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, expanded, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <IconBubble name={icon} shape="square" size={52} variant="grey" />
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text numberOfLines={1} style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {dot ? <View style={styles.dot} /> : null}
      {busy ? <ActivityIndicator color={ui.accent} /> : <Icon color={ui.ink} name={expanded ? 'chevron-down' : 'chevron-right'} size={28} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14, paddingTop: 16 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20 },
  summaryCopy: { flex: 1, gap: 6 },
  summaryName: { color: ui.ink, fontSize: 21, lineHeight: 27, fontWeight: '800' },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryEmail: { flex: 1, color: ui.muted, fontSize: 15, lineHeight: 20 },
  memberPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginTop: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: uiRadii.pill, backgroundColor: ui.accentSoft },
  memberLabel: { color: ui.accent, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  menu: { gap: 12 },
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 12, paddingVertical: 12, borderRadius: uiRadii.lg, backgroundColor: ui.card, ...shadows.card },
  pressed: { opacity: 0.85 },
  rowCopy: { flex: 1, gap: 2 },
  rowLabel: { color: ui.ink, fontSize: 17, lineHeight: 23, fontWeight: '500' },
  rowSubtitle: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: ui.accent },
  details: { gap: 16 },
  metadataRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metadataCopy: { flex: 1, gap: 2 },
  metadataLabel: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  metadataValue: { color: ui.ink, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  metadataHelper: { color: ui.muted, fontSize: 12, lineHeight: 16 },
});
