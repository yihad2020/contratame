import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import type { MarketplaceResult } from '@/modules/marketplace/types';
import { formatMarketplaceDistance, formatMarketplacePrice } from '@/modules/marketplace/validation';

function initialsOf(name: string) {
  return name.split(/\s+/).map((part) => part[0] ?? '').join('').slice(0, 2).toUpperCase();
}

export function MarketplaceResultCard({ result, onOpen }: { result: MarketplaceResult; onOpen: () => void }) {
  const distance = formatMarketplaceDistance(result.distance_m);
  const facts = [
    { label: 'Experiencia', value: result.years_experience === null ? '—' : `${result.years_experience} ${result.years_experience === 1 ? 'año' : 'años'}` },
    { label: 'Radio', value: `${Math.round(result.service_radius_m / 1000)} km` },
    { label: 'Precio', value: result.pricing_type === 'quote' ? 'A cotizar' : formatMarketplacePrice(result.pricing_type, result.price_bob) },
  ];

  return (
    <PressableScale
      accessibilityHint="Abre el perfil público del profesional"
      accessibilityLabel={`${result.display_name}, ${result.category_name}, ${result.public_area_label}`}
      accessibilityRole="button"
      onPress={onOpen}
      pressedScale={0.985}
      style={styles.card}
    >
      <View style={styles.identityRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(result.display_name)}</Text>
        </View>
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={styles.name}>{result.display_name}</Text>
            {result.is_verified ? (
              <View style={styles.verified}>
                <AppIcon name="check" color={colors.success} size={14} />
                <Text style={styles.verifiedText}>Verificado</Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={styles.meta}>
            {result.category_name} · {distance ? `${distance} · ` : ''}{result.public_area_label}
          </Text>
        </View>
        <AppIcon name="chevronRight" color={colors.textSecondary} size={sizing.iconSm} />
      </View>

      <View style={styles.facts}>
        {facts.map((fact, index) => (
          <View key={fact.label} style={[styles.fact, index > 0 && styles.factDivider]}>
            <Text numberOfLines={1} style={styles.factValue}>{fact.value}</Text>
            <Text style={styles.factLabel}>{fact.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.service}>
        <Text style={styles.serviceTitle}>{result.service_title}</Text>
        {result.service_description ? <Text numberOfLines={2} style={styles.serviceCopy}>{result.service_description}</Text> : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: radii.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontSize: 17, lineHeight: 22, fontWeight: '800', letterSpacing: -0.3 },
  identity: { flex: 1, gap: spacing.xxs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flexShrink: 1, color: colors.text, fontSize: 17, lineHeight: 22, fontWeight: '800', letterSpacing: -0.3 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radii.pill, backgroundColor: colors.successSoft },
  verifiedText: { color: colors.success, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  meta: { color: colors.textSecondary, ...typography.caption },
  facts: { flexDirection: 'row', borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  fact: { flex: 1, gap: spacing.xxs, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  factDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  factValue: { color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '800', letterSpacing: -0.3 },
  factLabel: { color: colors.textSecondary, fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  service: { gap: spacing.xs },
  serviceTitle: { color: colors.text, ...typography.label },
  serviceCopy: { color: colors.textSecondary, ...typography.caption },
});
