import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/ui/AppHeader';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Title } from '@/components/ui/Typography';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/modules/auth/auth-context';

export default function HomeScreen() {
  const { profile, user } = useAuth();

  function showComingSoon(feature: string) {
    Alert.alert('Próximamente', feature + ' estará disponible en una siguiente etapa de Contrátame!.');
  }

  return (
    <Screen contentStyle={styles.screen}>
      <AppHeader
        action={{ label: 'Abrir mi perfil', icon: 'account', onPress: () => router.push('/(app)/profile') }}
        greeting="Hola 👋"
        name={profile?.first_name ?? 'Bienvenido'}
        variant="personalized"
      />
      <View style={styles.intro}>
        <Title>¿Qué quieres hacer hoy?</Title>
        <Text style={styles.subtitle}>Explora talento local o administra tus servicios.</Text>
      </View>
      <View style={styles.choices}>
        <ChoiceCard
          description="Encuentra profesionales cerca de ti."
          icon="search"
          onPress={() => showComingSoon('La búsqueda de profesionales')}
          title="Necesito un servicio"
        />
        <ChoiceCard
          accent="green"
          description="Crea tu perfil profesional."
          icon="tools"
          onPress={() => showComingSoon('El perfil profesional')}
          title="Quiero ofrecer mis servicios"
        />
      </View>
      <View style={styles.profileSection}>
        <SectionHeader
          actionLabel="Editar"
          onAction={() => router.push('/(app)/profile')}
          title="Tu perfil"
        />
        <View style={styles.profileSurface}>
          <Text style={styles.profileName}>
            {profile ? profile.first_name + ' ' + profile.last_name : 'Cuenta Contrátame!'}
          </Text>
          <Text numberOfLines={1} style={styles.email}>{user?.email}</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  intro: { gap: spacing.xs },
  subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 21 },
  choices: { gap: spacing.md },
  profileSection: { gap: spacing.xs, marginTop: spacing.xs },
  profileSurface: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  profileName: { color: colors.text, ...typography.bodyStrong },
  email: { color: colors.textSecondary, ...typography.caption },
});
