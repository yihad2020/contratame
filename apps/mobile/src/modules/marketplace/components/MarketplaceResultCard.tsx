import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Card, Tag } from '@/components/ui/Kit';
import { PillButton } from '@/components/ui/PillButton';
import { ui } from '@/constants/theme';
import { marketplacePriceParts } from '@/modules/marketplace/price-display';
import type { MarketplaceResult } from '@/modules/marketplace/types';
import { formatMarketplaceDistance, formatMarketplacePrice } from '@/modules/marketplace/validation';

/** Worker card from the Inicio / Explorar mockups, built only from fields the marketplace search returns. */
export function MarketplaceResultCard({ result, onOpen, showExperience = true }: { result: MarketplaceResult; onOpen: () => void; showExperience?: boolean }) {
  const distance = formatMarketplaceDistance(result.distance_m);
  const price = marketplacePriceParts(result.pricing_type, result.price_bob);
  const experience = result.years_experience === null
    ? 'Experiencia no indicada'
    : `${result.years_experience} años de experiencia`;
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Avatar badge={result.is_verified ? 'verified' : undefined} name={result.display_name} size={68} />
        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.identity}>
              <Text
                accessibilityLabel={result.is_verified ? `${result.display_name}, profesional verificado` : result.display_name}
                numberOfLines={1}
                style={styles.name}
              >
                {result.display_name}
              </Text>
              <Text numberOfLines={1} style={styles.category}>{result.category_name}</Text>
            </View>
            <View accessibilityLabel={formatMarketplacePrice(result.pricing_type, result.price_bob)} accessible style={styles.priceBlock}>
              <Text style={styles.priceCaption}>{price.caption}</Text>
              <Text numberOfLines={1} style={[styles.price, result.pricing_type === 'quote' && styles.priceQuote]}>{price.amount}</Text>
              {price.unit ? <Text style={styles.priceCaption}>{price.unit}</Text> : null}
            </View>
          </View>
          <View style={styles.middleRow}>
            <View style={styles.locationRow}>
              <Icon color={ui.subtle} name="map-marker" size={16} />
              <Text numberOfLines={2} style={styles.location}>
                {distance ? `A ${distance} · ` : ''}{result.public_area_label} · {result.city}
              </Text>
            </View>
            <PillButton accessibilityLabel={`Ver perfil de ${result.display_name}`} chevron label="Ver perfil" onPress={onOpen} size="sm" style={styles.open} />
          </View>
        </View>
      </View>
      <View style={styles.tags}>
        <Tag label={result.service_title} />
        {showExperience ? <Tag label={experience} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  body: { flex: 1, gap: 8 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  identity: { flex: 1, gap: 2, paddingTop: 2 },
  name: { color: ui.ink, fontSize: 18, lineHeight: 23, fontWeight: '700' },
  category: { color: ui.inkSoft, fontSize: 15, lineHeight: 20 },
  priceBlock: { alignItems: 'flex-end' },
  priceCaption: { color: ui.muted, fontSize: 12, lineHeight: 15 },
  price: { color: ui.ink, fontSize: 19, lineHeight: 24, fontWeight: '800' },
  priceQuote: { fontSize: 15, lineHeight: 20 },
  middleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  location: { flexShrink: 1, color: ui.muted, fontSize: 13, lineHeight: 18 },
  open: { flexShrink: 0 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 80 },
});
