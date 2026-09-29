import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing, typography } from '@/constants/theme';

export default function PublicWorkerRouteFoundation() {
  const { workerId } = useLocalSearchParams<{ workerId: string }>();
  const validWorkerId = typeof workerId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workerId);
  return (
    <Screen footer={<MarketplaceNav active="explore" />} header={<MarketplaceHeader back={() => router.back()} title="Perfil profesional" subtitle="Vista pública en preparación" />} contentStyle={styles.screen}>
      <View style={styles.surface}>
        <Text style={styles.title}>{validWorkerId ? 'Perfil público disponible en MOD-05' : 'Perfil no disponible'}</Text>
        <Text style={styles.copy}>{validWorkerId
          ? 'La búsqueda ya conserva el identificador público del profesional. La información completa, portafolio y acciones de contacto se incorporarán sin inventar datos en el siguiente módulo.'
          : 'El identificador del profesional no es válido. Regresa a Explorar y selecciona otro resultado.'}</Text>
      </View>
      <AppButton label="Volver a Explorar" variant="secondary" onPress={() => router.replace('/(app)/explore' as never)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl },
  surface: { gap: spacing.md, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  title: { color: colors.navy, ...typography.title },
  copy: { color: colors.textSecondary, ...typography.body },
});
