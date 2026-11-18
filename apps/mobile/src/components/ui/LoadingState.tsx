import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { MascotImage } from '@/components/ui/MascotImage';
import { ui } from '@/constants/theme';

export function LoadingState() {
  return (
    <View accessibilityLabel="Cargando Contrátame!" accessibilityRole="progressbar" style={styles.container}>
      <MascotImage size={140} />
      <Text style={styles.brand}>Contrátame!</Text>
      <View style={styles.loadingRow}>
        <ActivityIndicator color={ui.accent} />
        <Text style={styles.label}>Preparando tu experiencia…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: ui.page },
  brand: { color: ui.navy, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: ui.card },
  label: { color: ui.muted, fontSize: 14, lineHeight: 19, fontWeight: '500' },
});
