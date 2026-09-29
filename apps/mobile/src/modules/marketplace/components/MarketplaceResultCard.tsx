import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import type { MarketplaceResult } from '@/modules/marketplace/types';
import { formatMarketplaceDistance, formatMarketplacePrice } from '@/modules/marketplace/validation';

export function MarketplaceResultCard({ result, onOpen }: { result: MarketplaceResult; onOpen: () => void }) {
  const distance = formatMarketplaceDistance(result.distance_m);
  const initials = result.display_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name}>{result.display_name}</Text>
          <Text style={styles.category}>{result.category_name}</Text>
          <View style={styles.locationRow}>
            <AppIcon name="location" color={colors.textSecondary} size={sizing.iconSm} />
            <Text style={styles.location} numberOfLines={1}>
              {distance ? `${distance} · ` : ''}{result.public_area_label}, {result.city}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.service}>
        <Text style={styles.serviceTitle}>{result.service_title}</Text>
        {result.service_description ? <Text numberOfLines={2} style={styles.description}>{result.service_description}</Text> : null}
        <View style={styles.detailRow}>
          <Text style={styles.experience}>
            {result.years_experience === null
              ? 'Experiencia no indicada'
              : `${result.years_experience} años de experiencia`}
          </Text>
          <Text style={styles.price}>{formatMarketplacePrice(result.pricing_type, result.price_bob)}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.openButton, pressed && styles.openPressed]}
      >
        <Text style={styles.openLabel}>Ver perfil</Text>
        <AppIcon name="chevronRight" color={colors.primary} size={sizing.iconSm} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl },
  topRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: { width: 52, height: 52, borderRadius: radii.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.primary, ...typography.bodyStrong },
  identity: { flex: 1, gap: spacing.xxs },
  name: { color: colors.text, ...typography.section },
  category: { color: colors.primary, ...typography.label },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  location: { flex: 1, color: colors.textSecondary, ...typography.caption },
  service: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderColor: colors.border },
  serviceTitle: { color: colors.text, ...typography.bodyStrong },
  description: { color: colors.textSecondary, ...typography.caption },
  detailRow: { gap: spacing.xs },
  experience: { color: colors.textSecondary, ...typography.caption },
  price: { color: colors.navy, ...typography.label },
  openButton: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radii.md, backgroundColor: colors.primarySoft },
  openPressed: { backgroundColor: colors.surfaceMuted },
  openLabel: { color: colors.primary, ...typography.label },
});
