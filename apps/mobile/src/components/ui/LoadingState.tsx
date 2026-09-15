import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { MascotImage } from '@/components/ui/MascotImage';
import { colors, spacing, typography } from '@/constants/theme';

export function LoadingState() {
  return (
    <View accessibilityLabel="Cargando Contrátame!" accessibilityRole="progressbar" style={styles.container}>
      <MascotImage size={140} />
      <Text style={styles.brand}>Contrátame!</Text>
      <View style={styles.loadingRow}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.label}>Preparando tu experiencia…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.background },
  brand: { color: colors.primary, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  label: { color: colors.textSecondary, ...typography.caption },
});
